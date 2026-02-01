import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
    @ApiProperty()
    @Prop({ required: true, unique: true })
    firebaseUid: string;

    @ApiProperty()
    @Prop({ required: true, unique: true })
    email: string;

    @ApiProperty()
    @Prop({ required: true, unique: true })
    username: string;

    @ApiProperty()
    @Prop()
    avatar?: string;

    @ApiProperty()
    @Prop({ default: 0 })
    trophies: number;

    @ApiProperty()
    @Prop({ default: 0 })
    classicWins: number;

    @ApiProperty()
    @Prop({ default: 0 })
    classicLosses: number;

    @ApiProperty()
    @Prop({ default: 0 })
    ctfWins: number;

    @ApiProperty()
    @Prop({ default: 0 })
    ctfLosses: number;

    @ApiProperty()
    @Prop({ default: Date.now })
    createdAt: Date;

    @ApiProperty()
    @Prop({ default: Date.now })
    lastLoginAt: Date;

    @ApiProperty()
    @Prop()
    sessionToken?: string;
}

export const userSchema = SchemaFactory.createForClass(User);
