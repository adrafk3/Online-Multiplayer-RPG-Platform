import { BoardCell } from '@common/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGameDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    gameMode: string;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;

    @ApiProperty()
    @IsNumber()
    gridSize: number;

    @ApiProperty()
    @IsString()
    imagePayload: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    lastModified?: string;

    @ApiProperty()
    @IsArray()
    board: BoardCell[][];
}
