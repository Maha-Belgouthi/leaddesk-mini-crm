import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/note.entity.js';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';
import { ActivityModule } from '../activity/activity.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), ActivityModule],
  providers: [NotesService],
  controllers: [NotesController],
  exports: [NotesService],
})
export class NotesModule {}
