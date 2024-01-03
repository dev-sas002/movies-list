/** The collection the seeder plants, chosen to span decades, genres and moods. */
export interface SeedMovie {
  title: string;
  publishYear: number;
  synopsis: string;
  tags: string[];
}

export const SEED_MOVIES: SeedMovie[] = [
  {
    title: 'Blade Runner',
    publishYear: 1982,
    synopsis:
      'A burnt-out detective hunts four synthetic fugitives through a perpetually raining city and starts to doubt which side of the line he stands on.',
    tags: ['sci-fi', 'noir', 'thriller'],
  },
  {
    title: 'Alien',
    publishYear: 1979,
    synopsis:
      'A commercial towing crew answers a distress signal and brings something aboard. The warrant officer, a female lead who trusts nobody, is the only one taking the quarantine rules seriously.',
    tags: ['sci-fi', 'horror', 'female-lead'],
  },
  {
    title: 'Jurassic Park',
    publishYear: 1993,
    synopsis:
      'A billionaire invites two palaeontologists to inspect his island park before opening. The power goes out during the tour.',
    tags: ['adventure', 'sci-fi', 'family'],
  },
  {
    title: 'Heat',
    publishYear: 1995,
    synopsis:
      'A methodical crew plans one last armoured-car score while the detective tracking them mirrors their discipline move for move.',
    tags: ['crime', 'thriller', 'heist'],
  },
  {
    title: 'Fargo',
    publishYear: 1996,
    synopsis:
      'A car salesman hires two men to kidnap his own wife. A pregnant small-town police chief, the calmest female lead in the state, follows the trail through the snow.',
    tags: ['crime', 'drama', 'female-lead'],
  },
  {
    title: 'Contact',
    publishYear: 1997,
    synopsis:
      'A radio astronomer picks up a signal from Vega and fights the institutions around her for the right to answer it. A female lead carries the whole film.',
    tags: ['sci-fi', 'drama', 'female-lead'],
  },
  {
    title: 'The Matrix',
    publishYear: 1999,
    synopsis:
      'A programmer discovers that the world he lives in is a simulation and is offered the chance to see what is underneath it.',
    tags: ['sci-fi', 'action', 'thriller'],
  },
  {
    title: 'Spirited Away',
    publishYear: 2001,
    synopsis:
      'A sullen ten-year-old wanders into a bathhouse for spirits and has to work her way out to save her parents.',
    tags: ['animation', 'fantasy', 'family', 'female-lead'],
  },
  {
    title: 'The Grand Budapest Hotel',
    publishYear: 2014,
    synopsis:
      'A legendary concierge and his lobby boy are drawn into the theft of a priceless painting and a battle over a family fortune.',
    tags: ['comedy', 'adventure', 'crime'],
  },
  {
    title: 'Mad Max: Fury Road',
    publishYear: 2015,
    synopsis:
      'An imperator turns her war rig off the road to smuggle five women out of a tyrant’s citadel, and the whole convoy comes after her.',
    tags: ['action', 'adventure', 'female-lead'],
  },
  {
    title: 'Arrival',
    publishYear: 2016,
    synopsis:
      'A linguist is brought in to talk to the occupants of twelve ships and learns that their language changes how she experiences time.',
    tags: ['sci-fi', 'drama', 'female-lead'],
  },
  {
    title: 'Dune',
    publishYear: 2021,
    synopsis:
      'A noble family is handed stewardship of the only planet that produces the spice, and walks straight into the trap that comes with it.',
    tags: ['sci-fi', 'adventure', 'drama'],
  },
];
