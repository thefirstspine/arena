import { Test, TestingModule } from '@nestjs/testing';
import { GameWorkerService } from './game-worker.service';
import { ApiService } from '../../api/api.service';
import { GameService } from '../game.service';
import { QueueService } from '../../queue/queue.service';
import { TickerService } from '../../ticker/ticker.service';
import { WizardService } from '../../wizard/wizard.service';
import { ShopService } from '../../shop/shop.service';
import { RestService } from '../../rest/rest.service';
import { RoomsService } from '../../rooms/rooms.service';
import { ArenaRoomsService } from '../../rooms/arena-rooms.service';
import { GameHookService } from '../game-hook/game-hook.service';
import { BotsService } from '../../bots/bots.service';
import { IGameInstance, IGameAction, IInteractionMoveCardToDiscard } from '@thefirstspine/types-arena';
import { AuthService } from '@thefirstspine/auth-nest';
import { LogsService } from '@thefirstspine/logs-nest';
import { MessagingService } from '@thefirstspine/messaging-nest';

describe('Throw cards', () => {
  let gameWorkerService: GameWorkerService;
  let restService: RestService;
  let roomsService: RoomsService;

  /**
   * ======================================================================
   * INIT TESTS AND DEPENDENCIES
   * ======================================================================
   */

  beforeEach(async () => {
    require('dotenv').config();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiService,
        GameService,
        QueueService,
        TickerService,
        WizardService,
        ShopService,
        AuthService,
        LogsService,
        RestService,
        RoomsService,
        ArenaRoomsService,
        MessagingService,
        GameWorkerService,
        GameHookService,
        BotsService,
      ],
    }).compile();

    gameWorkerService = module.get<GameWorkerService>(GameWorkerService);
    restService = module.get<RestService>(RestService);
    roomsService = module.get<RoomsService>(RoomsService);
  });

  /**
   * ======================================================================
   * TEST SERVICE CREATION
   * ======================================================================
   */

  it('should be defined', () => {
    expect(gameWorkerService).toBeDefined();
    expect(restService).toBeDefined();
    expect(roomsService).toBeDefined();
  });

  /**
   * ======================================================================
   * CREATE ROOM
   * ======================================================================
   */

  test('room creation', async () => {
    try {
      await roomsService.createRoom('arena', {
        name: 'game-0',
        senders: [],
      });
    } catch (e) {
      // Do nothing
    }
  });

  /**
   * ======================================================================
   * TEST TO THROW ONE CARD WITH SUFFICIENT CARDS IN DECK
   * ======================================================================
   */

  test('throw one card with sufficient cards in deck', async () => {
    // Get base cards
    const bansheeCard = await restService.card('banshee');
    const hunterCard = await restService.card('hunter');
    expect(bansheeCard).toBeDefined();
    expect(hunterCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: hunterCard,
      coords : {
        x: 3,
        y: 0,
      },
      currentStats: JSON.parse(JSON.stringify(hunterCard.stats)),
      user: gameInstance.users[0].user,
      location: 'board',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('throw-cards').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndexes: [0]};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('moveCardsToDiscard');
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes.length).toBe(4);
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes[0]).toBe(0);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('throw-cards').execute(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[0].currentStats).toBeDefined();
    expect(gameInstance.cards[0].currentStats.life).toBe(hunterCard.stats.life);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[2].location).toBe('hand');
    expect(gameInstance.cards[3].location).toBe('hand');
    expect(gameInstance.cards[4].location).toBe('hand');
    expect(gameInstance.cards[5].location).toBe('hand');
    expect(gameInstance.cards[6].location).toBe('hand');
    expect(gameInstance.cards[7].location).toBe('hand');
    expect(gameInstance.cards[8].location).toBe('deck');
  });

  /**
   * ======================================================================
   * TEST TO THROW TWO CARDS WITH SUFFICIENT CARDS IN DECK
   * ======================================================================
   */

  test('throw two cards with sufficient cards in deck', async () => {
    // Get base cards
    const bansheeCard = await restService.card('banshee');
    const hunterCard = await restService.card('hunter');
    expect(bansheeCard).toBeDefined();
    expect(hunterCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: hunterCard,
      coords : {
        x: 3,
        y: 0,
      },
      currentStats: JSON.parse(JSON.stringify(hunterCard.stats)),
      user: gameInstance.users[0].user,
      location: 'board',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('throw-cards').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndexes: [0, 1]};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('moveCardsToDiscard');
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes.length).toBe(4);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('throw-cards').execute(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[0].currentStats).toBeDefined();
    expect(gameInstance.cards[0].currentStats.life).toBe(hunterCard.stats.life - 1);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[2].location).toBe('discard');
    expect(gameInstance.cards[3].location).toBe('hand');
    expect(gameInstance.cards[4].location).toBe('hand');
    expect(gameInstance.cards[5].location).toBe('hand');
    expect(gameInstance.cards[6].location).toBe('hand');
    expect(gameInstance.cards[7].location).toBe('hand');
    expect(gameInstance.cards[8].location).toBe('hand');
    expect(gameInstance.cards[9].location).toBe('deck');
  });

  /**
   * ======================================================================
   * TEST TO THROW ONE CARD WITH UNSUFFICIENT CARDS IN DECK
   * ======================================================================
   */

  test('throw one card with unsufficient cards in deck', async () => {
    // Get base cards
    const bansheeCard = await restService.card('banshee');
    const hunterCard = await restService.card('hunter');
    expect(bansheeCard).toBeDefined();
    expect(hunterCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: hunterCard,
      coords : {
        x: 3,
        y: 0,
      },
      currentStats: JSON.parse(JSON.stringify(hunterCard.stats)),
      user: gameInstance.users[0].user,
      location: 'board',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('throw-cards').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndexes: [0]};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('moveCardsToDiscard');
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes.length).toBe(4);
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes[0]).toBe(0);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('throw-cards').execute(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[0].currentStats).toBeDefined();
    expect(gameInstance.cards[0].currentStats.life).toBe(hunterCard.stats.life - 1);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[2].location).toBe('hand');
    expect(gameInstance.cards[3].location).toBe('hand');
    expect(gameInstance.cards[4].location).toBe('hand');
    expect(gameInstance.cards[5].location).toBe('hand');
    expect(gameInstance.cards[6].location).toBe('hand');
  });

  /**
   * ======================================================================
   * TEST TO THROW TWO CARDS WITH UNSUFFICIENT CARDS IN DECK
   * ======================================================================
   */

  test('throw two cards with unsufficient cards in deck', async () => {
    // Get base cards
    const bansheeCard = await restService.card('banshee');
    const hunterCard = await restService.card('hunter');
    expect(bansheeCard).toBeDefined();
    expect(hunterCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: hunterCard,
      coords : {
        x: 3,
        y: 0,
      },
      currentStats: JSON.parse(JSON.stringify(hunterCard.stats)),
      user: gameInstance.users[0].user,
      location: 'board',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      currentStats: JSON.parse(JSON.stringify(bansheeCard.stats)),
      user: gameInstance.users[0].user,
      location: 'deck',
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('throw-cards').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndexes: [0, 1]};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('moveCardsToDiscard');
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionMoveCardToDiscard).params.handIndexes.length).toBe(4);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('throw-cards').execute(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[0].currentStats).toBeDefined();
    expect(gameInstance.cards[0].currentStats.life).toBe(hunterCard.stats.life - 2);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[2].location).toBe('discard');
    expect(gameInstance.cards[3].location).toBe('hand');
    expect(gameInstance.cards[4].location).toBe('hand');
    expect(gameInstance.cards[5].location).toBe('hand');
    expect(gameInstance.cards[6].location).toBe('hand');
    expect(gameInstance.cards[7].location).toBe('hand');
  });
});

function getDefaultGameInstance(): IGameInstance {
  return {
    cards: [],
    id: 0,
    gameTypeId: 'testing',
    status: 'active',
    actions: {
      current: [],
      previous: [],
    },
    modifiers: [],
    theme: 'forest',
    users: [
      {destiny: 'hunter', user: Number.MAX_SAFE_INTEGER - 1, origin: null, style: ''},
      {destiny: 'hunter', user: Number.MAX_SAFE_INTEGER - 2, origin: null, style: ''},
    ],
  };
}
