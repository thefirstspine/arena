import {Length, IsOptional, IsNumber, IsIn} from 'class-validator';

export class PatchWizardDto {

  @Length(3, 100)
  @IsOptional()
  name?: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  @IsNumber({}, {each: true})
  friends?: number[];

  @IsOptional()
  @IsIn(['fr', 'en'])
  publicRoom?: 'fr'|'en';
}
