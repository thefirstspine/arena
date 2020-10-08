import { IGameHook } from './game-hook.interface';
import { Injectable } from '@nestjs/common';
import { IGameInstance, IGameUser } from '@thefirstspine/types-arena';
import { RestService } from '../../rest/rest.service';
import { ICycle, ICard, ICardCoords } from '@thefirstspine/types-rest';
import { randBetween } from '../../utils/maths.utils';
import { shuffle } from '../../utils/array.utils';
import { Modifiers } from '../modifiers';

@Injectable()
export class GameCreatedGameHook implements IGameHook {

  constructor(
    private readonly restService: RestService,
  ) {}

  async execute(gameInstance: IGameInstance, params: {gameInstance: IGameInstance}): Promise<boolean> {
    if (gameInstance.modifiers.includes(Modifiers.GOLDEN_GALLEONS)) {
      // Get the "golden-galleon" card
      const goldenGalleonCard: ICard = await this.restService.card('golden-galleon');
      // Add the cards "golden-galleon"
      gameInstance.users.forEach((u: IGameUser) => {
        for (let i = 0; i < 6; i ++) {
          const randomId: number = randBetween(0, Number.MAX_SAFE_INTEGER);
          gameInstance.cards.push({
            card: goldenGalleonCard,
            id: `${gameInstance.id}_${randomId}`,
            location: 'deck',
            user: u.user,
            metadata: {},
            currentStats: JSON.parse(JSON.stringify(goldenGalleonCard.stats)),
          });
        }
      });
      // Shuffle the cards
      gameInstance.cards = shuffle(gameInstance.cards);
    }

    if (gameInstance.modifiers.includes(Modifiers.GREAT_ANCIENTS_EGGS)) {
      // Get the "great-ancient-egg" card
      const greatAncientCard: ICard = await this.restService.card('great-ancient-egg');
      // Add the cards "great-ancient-egg"
      gameInstance.users.forEach((u: IGameUser) => {
        for (let i = 0; i < 4; i ++) {
          const randomId: number = randBetween(0, Number.MAX_SAFE_INTEGER);
          gameInstance.cards.push({
            card: greatAncientCard,
            id: `${gameInstance.id}_${randomId}`,
            location: 'deck',
            user: u.user,
            metadata: {},
            currentStats: JSON.parse(JSON.stringify(greatAncientCard.stats)),
          });
        }
      });
      // Shuffle the cards
      gameInstance.cards = shuffle(gameInstance.cards);
    }

    if (gameInstance.modifiers.includes(Modifiers.SOUVENIRS_FROM_YOUR_ENEMY)) {
      // Get the "great-ancient-egg" card
      const hunterSouvenirCard: ICard = await this.restService.card('hunter-souvenir');
      const conjurerSouvenirCard: ICard = await this.restService.card('conjurer-souvenir');
      const summonerSouvenirCard: ICard = await this.restService.card('summoner-souvenir');
      const sorcererSouvenirCard: ICard = await this.restService.card('sorcerer-souvenir');
      const souvenirs = {
        hunter: hunterSouvenirCard,
        conjurer: conjurerSouvenirCard,
        summoner: summonerSouvenirCard,
        sorcerer: sorcererSouvenirCard,
      };
      // Add the cards "great-ancient-egg"
      gameInstance.users.forEach((u: IGameUser) => {
        // Get the opponent
        const opponent = gameInstance.users.find((potentialOpponent: IGameUser) => potentialOpponent !== u);
        for (let i = 0; i < 4; i ++) {
          const randomId: number = randBetween(0, Number.MAX_SAFE_INTEGER);
          gameInstance.cards.push({
            card: souvenirs[opponent.destiny],
            id: `${gameInstance.id}_${randomId}`,
            location: 'deck',
            user: u.user,
            metadata: {},
            currentStats: JSON.parse(JSON.stringify(souvenirs[opponent.destiny].stats)),
          });
        }
      });
      // Shuffle the cards
      gameInstance.cards = shuffle(gameInstance.cards);
    }

    if (gameInstance.modifiers.includes(Modifiers.ANNIHILATION_MATTS)) {
      // Get the "annihilation-matt" card
      const annihilationMattCard: ICard = await this.restService.card('annihilation-matt');
      // Add the cards "annihilation-matt"
      const coords: ICardCoords[] = [
        {x: 5, y: 5},
        {x: 1, y: 5},
        {x: 5, y: 1},
        {x: 1, y: 1},
      ];
      coords.forEach((coord: ICardCoords) => {
        const randomId: number = randBetween(0, Number.MAX_SAFE_INTEGER);
        gameInstance.cards.push({
          card: annihilationMattCard,
          id: `${gameInstance.id}_${randomId}`,
          location: 'board',
          user: 0,
          metadata: {},
          currentStats: JSON.parse(JSON.stringify(annihilationMattCard.stats)),
          coords: coord,
        });
      });
      // Shuffle the cards
      gameInstance.cards = shuffle(gameInstance.cards);
    }
    if (gameInstance.modifiers.includes(Modifiers.TRICK_OR_TREAT)) {
      // Get the "golden-galleon" card
      const trickOrTreatCard: ICard = await this.restService.card('trick-or-treat');
      // Add the cards "golden-galleon"
      gameInstance.users.forEach((u: IGameUser) => {
        for (let i = 0; i < 6; i ++) {
          const randomId: number = randBetween(0, Number.MAX_SAFE_INTEGER);
          gameInstance.cards.push({
            card: trickOrTreatCard,
            id: `${gameInstance.id}_${randomId}`,
            location: 'deck',
            user: u.user,
            metadata: {},
          });
        }
      });
      // Shuffle the cards
      gameInstance.cards = shuffle(gameInstance.cards);
    }

    return true;
  }

}
