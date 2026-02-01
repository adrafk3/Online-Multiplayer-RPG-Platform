import { BoardCell } from '@common/interfaces';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema()
export class Game {
    @ApiProperty()
    @Prop({ required: true, unique: true })
    name: string;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty()
    @Prop({ required: true })
    gameMode: string;

    @ApiProperty()
    @Prop({ default: true })
    isHidden?: boolean;

    @ApiProperty()
    @Prop({ required: true })
    gridSize: number;

    @ApiProperty()
    @Prop({ required: true })
    imagePayload: string;

    @ApiProperty()
    @Prop({ default: new Date().toISOString() })
    lastModified?: string;

    @ApiProperty()
    @Prop()
    board: BoardCell[][];

    @ApiProperty()
    _id?: string;
}

export const gameSchema = SchemaFactory.createForClass(Game);
