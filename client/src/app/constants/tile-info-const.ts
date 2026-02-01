import { TileTypes } from '@common/enums';
import { TILE_COST } from '@common/constants';

export const TILE_INFO: Record<TileTypes, string> = {
    [TileTypes.Water]: `Tuile: \n${TileTypes.Water} \nCoût: ${TILE_COST.get(TileTypes.Water)} \nRalentit le déplacement\n`,
    [TileTypes.Ice]: `Tuile: \n${TileTypes.Ice} \nCoût: ${TILE_COST.get(
        TileTypes.Ice,
    )} \nTerrain glissant, aucun coût de déplacement, mais malus de -2 à défense et attaque\n`,
    [TileTypes.Door]: `Tuile: \n${TileTypes.Door} \nPorte ouvrable et présentement non traversable\n`,
    [TileTypes.OpenedDoor]: `Tuile: \n${TileTypes.OpenedDoor} \nCoût: ${TILE_COST.get(TileTypes.OpenedDoor)} \nPorte fermable\n`,
    [TileTypes.Wall]: `Tuile: \n${TileTypes.Wall}  \nTuile non traversable\n`,
    [TileTypes.Default]: `Tuile: \nTuile de base\nCoût: ${TILE_COST.get(TileTypes.Default)}\n`,
} as const;
