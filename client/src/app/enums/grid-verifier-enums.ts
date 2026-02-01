export enum VerifierAnswer {
    CalculateTerrainFirst = '-Les tuiles de terrain occupent seulement',
    CalculateTerrainSecond = '    % de la carte. DOIT ÊTRE >= 50%. ',
    CorrectItems = '-Pas tous les items ont été placés. \n',
    FlagPlaced = "-Le drapeau n'a pas été placé.\n",
    ValidateItems = '-Les items ne peuvent pas être placés sur des tuiles de mur.\n',
    DoorsValid = '-Les portes DOIVENT avoir des murs collés SEULEMENT sur un axe. \n',
    StartingPoint = '-Pas tous les points de départ ont été placés.\n',
    InaccessibleTiles = '-Pas toutes les tuiles sont accessibles.\n',
}
