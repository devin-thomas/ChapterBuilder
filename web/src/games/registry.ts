import type { GameProfileId, ImplementedGameProfileId } from '../types';
import { genericProfile } from './generic';
import { streetFighter6Profile } from './streetFighter6';
import { twoXkoProfile } from './twoXko';
import type { GameProfile, GameProfileOption } from './types';

export const gameProfiles: Record<ImplementedGameProfileId, GameProfile> = {
  '2xko': twoXkoProfile,
  sf6: streetFighter6Profile,
  generic: genericProfile
};

export const gameProfileOptions: readonly GameProfileOption[] = [
  twoXkoProfile,
  streetFighter6Profile,
  genericProfile,
  {
    id: 'marvel-tokon',
    name: 'Marvel Tōkon: Fighting Souls',
    shortName: 'Marvel Tōkon',
    description: 'Profile stub only; roster and team rules are not implemented yet.',
    implemented: false
  },
  {
    id: 'avatar-legends',
    name: 'Avatar Legends: The Fighting Game',
    shortName: 'Avatar Legends',
    description: 'Profile stub only; roster and game-specific fields are not implemented yet.',
    implemented: false
  },
  {
    id: 'guilty-gear-strive',
    name: 'Guilty Gear -Strive-',
    shortName: 'GGST',
    description: 'Profile stub only; roster and game-specific fields are not implemented yet.',
    implemented: false
  }
];

export function isImplementedGameProfileId(value: unknown): value is ImplementedGameProfileId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(gameProfiles, value);
}

export function getGameProfile(id: GameProfileId | undefined): GameProfile {
  return id && isImplementedGameProfileId(id) ? gameProfiles[id] : twoXkoProfile;
}
