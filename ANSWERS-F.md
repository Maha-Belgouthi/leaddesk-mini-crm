# Section F – Questions on Your Own Projects

## 1. SmartClaim TT – Background Jobs :

> **Question:** Why did you use BullMQ and Redis for the blockchain anchoring jobs instead of calling the smart contract directly in the API request? If a job fails halfway, how do you retry it without anchoring the same claim twice?

I used BullMQ and Redis because calling the smart contract directly inside the API request was a very slow way. Blockchain transactions take several seconds to confirm, which would freeze the mobile app and risk HTTP request timeouts. With BullMQ, the API saves the claim in PostgreSQL away, gives the user an immediate response, and handles the blockchain anchoring in the background.

If a job fails halfway, we prevent duplicate anchoring using two simple checks:

1. **Queue level:** We give each job a custom BullMQ `jobId` (`register-claim-${claimId}`). This prevents BullMQ from enqueuing the same claim twice.
2. **Blockchain level:** Before sending the transaction, the worker calls `claimExists(numeroDemande)` on the smart contract. If it is already registered (for instance, if the previous attempt succeeded right before a network disconnect), we simply retrieve the existing receipt instead of sending a duplicate transaction.

If it fails due to a temporary network issue, BullMQ retries automatically up to 5 times with exponential backoff without creating duplicate entries on-chain.


## 2. SmartClaim TT – AI Classification Service:

> **Question:** What input features and which scikit-learn model did you use to predict claim type and priority? Which metric did you report, what was the value, and how did you handle uneven classes? What happens in the NestJS API when the FastAPI service is down?

For features, we used the user's description text (in French, Arabic, or English). After cleaning the text, we converted it into numerical features using scikit-learn's `TfidfVectorizer` (with unigrams and bigrams, up to 5,000 features).

We tested multiple models and chose `LinearSVC` (Linear SVM) for the claim type and `LogisticRegression` for the priority, as they performed best on text classification.

We reported Accuracy on a 20% test set, reaching around 93% for type and 87% for priority. To handle uneven classes (like "URGENTE" having fewer examples than "PANNE"), we used `stratify=y` during `train_test_split` so every split maintained the same class proportions. We also checked per-class F1-scores and tested `ComplementNB`, which is designed for imbalanced text data.

If the FastAPI service is down, NestJS catches the connection error in a `try...catch` block. The API does not crash; it logs the issue and returns sensible default values (`RECLAMATION` and `STANDARD`). This ensures the mobile user can still submit their claim smoothly without seeing an error.


## 3. Debugging Story :

> **Question:** Describe the bug that took you the longest to fix in any project: what you saw, how you found the cause, the fix, and what you now do differently.

The bug that took me the longest was during user registration in SmartClaimTT.

**What I saw:** When testing user sign-up on the mobile app, clicking "Sign up" randomly failed with a Prisma database error: `P2028: transaction expired after 5000ms`.

**How I found the cause:** At first, I assumed PostgreSQL was just being slow. But after adding timing logs inside `AuthService.register`, I realized the delay was happening inside the code. I had placed bcrypt password hashing (10 rounds) and AES data encryption inside Prisma's interactive transaction (`$transaction`). The CPU-heavy hashing was holding the transaction open too long, exceeding Prisma's default 5-second timeout.

**The fix:** I moved the password hashing and encryption outside and before opening the database transaction. The transaction now only performs the fast SQL inserts (User and Client), reducing execution time from over 8 seconds to under 40 milliseconds.

**What I do differently:** I learned to keep database transactions as short as possible. I never put heavy computations, hashing, or external API calls inside a database transaction block—only database queries.