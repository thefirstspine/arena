export class Themes {

  static readonly DEAD_FOREST: string = 'dead-forest';
  static readonly SPINE_S_CAVE: string = 'spine-s-cave';
  static readonly FORGOTTEN_CEMETERY: string = 'forgotten-cemetery';
  static readonly WASTED_FIELDS: string = 'wasted-fields';
  static readonly SACRIFICE_CHURCH: string = 'sacrifice-church';

  static get all(): string[] {
    return [
      Themes.DEAD_FOREST,
      Themes.SPINE_S_CAVE,
      Themes.FORGOTTEN_CEMETERY,
      Themes.WASTED_FIELDS,
    ];
  }

  static get user(): string[] {
    return [
      Themes.DEAD_FOREST,
      Themes.SPINE_S_CAVE,
      Themes.FORGOTTEN_CEMETERY,
    ];
  }

  static get system(): string[] {
    return [
      Themes.DEAD_FOREST,
      Themes.SPINE_S_CAVE,
      Themes.WASTED_FIELDS,
    ];
  }

}
