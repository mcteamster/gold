/**
 * Lobby model — pure functions (no class, takes/returns state).
 * Mirrors the JS Lobby class from model/lobby.js.
 */

import { GameState } from './gameState';

export interface LobbyPlayer {
  id: number;
  secret: number;
  name: string;
  meta: { type: string };
}

export interface LobbyState {
  roomID: string;
  players: LobbyPlayer[];
  colours: string[];
}

/** All available colours (from original Lobby class) */
export const COLOURS: string[] = [
  'AliceBlue', 'AntiqueWhite', 'Aqua', 'Aquamarine', 'Azure', 'Bisque',
  'BlanchedAlmond', 'BlueViolet', 'BurlyWood', 'CadetBlue', 'Chartreuse',
  'Coral', 'CornflowerBlue', 'Cornsilk', 'Crimson', 'Cyan', 'DarkCyan',
  'DarkGoldenRod', 'DarkGray', 'DarkGrey', 'DarkKhaki', 'DarkMagenta',
  'DarkOrange', 'DarkOrchid', 'DarkSalmon', 'DarkSeaGreen', 'DarkTurquoise',
  'DarkViolet', 'DeepPink', 'DeepSkyBlue', 'DodgerBlue', 'FireBrick',
  'FloralWhite', 'ForestGreen', 'Fuchsia', 'Gainsboro', 'Gold', 'GoldenRod',
  'Green', 'GreenYellow', 'HotPink', 'IndianRed', 'Khaki', 'Lavender',
  'LavenderBlush', 'LawnGreen', 'LemonChiffon', 'LightBlue', 'LightCoral',
  'LightCyan', 'LightGreen', 'LightPink', 'LightSalmon', 'LightSeaGreen',
  'LightSkyBlue', 'LightSteelBlue', 'Lime', 'LimeGreen', 'Linen', 'Magenta',
  'MediumAquaMarine', 'MediumOrchid', 'MediumSeaGreen', 'MediumSpringGreen',
  'MediumTurquoise', 'MediumVioletRed', 'MistyRose', 'Moccasin', 'NavajoWhite',
  'Orange', 'OrangeRed', 'Orchid', 'PaleGoldenRod', 'PaleGreen', 'PaleTurquoise',
  'PaleVioletRed', 'PapayaWhip', 'PeachPuff', 'Pink', 'Plum', 'PowderBlue',
  'Red', 'RosyBrown', 'Salmon', 'SandyBrown', 'SeaGreen', 'SeaShell', 'Silver',
  'SkyBlue', 'Snow', 'SpringGreen', 'Tan', 'Thistle', 'Tomato', 'Turquoise',
  'Violet', 'Wheat', 'Yellow', 'YellowGreen',
];

/**
 * Add a player to the lobby and game state.
 * Returns the new LobbyPlayer (with secret) on success, or an error string.
 */
export function addPlayer(
  lobbyPlayers: LobbyPlayer[],
  colours: string[],
  gs: GameState,
  playerName: string
): LobbyPlayer | string {
  if (lobbyPlayers.find((x) => x.name === playerName)) {
    return `${new Date()} Name Taken`;
  }

  const newPlayer: LobbyPlayer = {
    id: lobbyPlayers.length + 1,
    secret: Math.floor(Math.random() * 100000000000),
    name: playerName,
    meta: { type: 'secret' },
  };

  // Pick a random colour and remove it from available colours
  const colourIndex = Math.floor(Math.random() * colours.length);
  const [colour] = colours.splice(colourIndex, 1);

  gs.players.push({
    id: newPlayer.id,
    colour: [colour],
    name: newPlayer.name,
    roundScores: new Array(5),
    totalScore: 0,
    active: true,
  });

  lobbyPlayers.push(newPlayer);
  return newPlayer;
}

/** Check whether a player's name + clientSecret match a registered player */
export function checkPlayer(
  lobbyPlayers: LobbyPlayer[],
  playerName: string,
  clientSecret: number | string
): boolean {
  return !!lobbyPlayers.find(
    (x) => x.name === playerName && x.secret == (clientSecret as number)
  );
}

/** Authenticate a player by playerID + clientSecret. Returns timestamp or false. */
export function authPlayer(
  lobbyPlayers: LobbyPlayer[],
  playerID: number | string,
  clientSecret: number | string
): Date | false {
  if (
    lobbyPlayers.find(
      (x) => x.id == (playerID as number) && x.secret == (clientSecret as number)
    )
  ) {
    return new Date();
  }
  return false;
}
