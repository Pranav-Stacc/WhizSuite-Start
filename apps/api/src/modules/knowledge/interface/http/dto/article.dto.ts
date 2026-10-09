import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ARTICLE_BODY_MAX_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  ArticleCategories,
  type ArticleCategory,
  type ArticleInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateArticleDto implements ArticleInput {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(ARTICLE_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ enum: ArticleCategories })
  @IsIn(ArticleCategories)
  category!: ArticleCategory;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(ARTICLE_BODY_MAX_LENGTH)
  body!: string;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
