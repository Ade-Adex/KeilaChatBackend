// /src/services/ai/ai.football.ts

import type { AIIntent } from './ai.types.js'

export const footballIntents: AIIntent[] = [
  {
    patterns: [
      'arsenal',
      'arsenal fc',
      'the gunners',
      'do you know arsenal',
      'what is arsenal',
      'who are arsenal',
      'tell me about arsenal',
    ],
    responses: [
      'Arsenal Football Club is a professional football club based in London, England, competing in the Premier League.',
      'Arsenal, also known as "The Gunners", is one of the most successful clubs in English football.',
      'Arsenal FC is a historic English football club known for its achievements and passionate supporters.',
    ],
  },

  {
    patterns: [
      'chelsea',
      'chelsea fc',
      'the blues',
      'do you know chelsea',
      'what is chelsea',
      'who are chelsea',
      'tell me about chelsea',
    ],
    responses: [
      'Chelsea Football Club is a professional football club based in London, England.',
      'Chelsea, nicknamed "The Blues", is one of the leading clubs in English and European football.',
      'Chelsea FC has enjoyed significant domestic and international success.',
    ],
  },

  {
    patterns: [
      'liverpool',
      'liverpool fc',
      'the reds',
      'do you know liverpool',
      'what is liverpool',
      'tell me about liverpool',
    ],
    responses: [
      'Liverpool Football Club is a professional football club based in Liverpool, England.',
      'Liverpool FC is one of the most successful clubs in English and European football history.',
      'Liverpool, also known as "The Reds", has a rich football heritage.',
    ],
  },

  {
    patterns: [
      'manchester united',
      'man utd',
      'man united',
      'manu',
      'red devils',
      'do you know manchester united',
      'what is manchester united',
      'tell me about manchester united',
    ],
    responses: [
      'Manchester United is a professional football club based in Manchester, England.',
      'Manchester United, nicknamed "The Red Devils", is one of the most famous football clubs in the world.',
      'Manchester United has won numerous domestic and European titles.',
    ],
  },

  {
    patterns: [
      'manchester city',
      'man city',
      'citizens',
      'sky blues',
      'do you know manchester city',
      'what is manchester city',
      'tell me about manchester city',
    ],
    responses: [
      'Manchester City is a professional football club based in Manchester, England.',
      'Manchester City has become one of the most successful clubs in modern football.',
      'Manchester City competes in the English Premier League and European competitions.',
    ],
  },

  {
    patterns: [
      'real madrid',
      'madrid',
      'los blancos',
      'do you know real madrid',
      'what is real madrid',
      'tell me about real madrid',
    ],
    responses: [
      'Real Madrid is a professional football club based in Madrid, Spain.',
      'Real Madrid is one of the most successful football clubs in the history of the sport.',
      'Real Madrid, also known as "Los Blancos", has won numerous domestic and European titles.',
    ],
  },

  {
    patterns: [
      'barcelona',
      'fc barcelona',
      'barca',
      'blaugrana',
      'do you know barcelona',
      'what is barcelona',
      'tell me about barcelona',
    ],
    responses: [
      'FC Barcelona is a professional football club based in Barcelona, Spain.',
      'Barcelona, often called "Barça", is one of the most successful football clubs in the world.',
      'FC Barcelona is known for its football philosophy and historic achievements.',
    ],
  },

  {
    patterns: [
      'bayern munich',
      'bayern',
      'do you know bayern munich',
      'what is bayern munich',
      'tell me about bayern munich',
    ],
    responses: [
      'Bayern Munich is a professional football club based in Munich, Germany.',
      'Bayern Munich is the most successful football club in German history.',
      'Bayern Munich regularly competes at the highest level of European football.',
    ],
  },

  {
    patterns: [
      'psg',
      'paris saint germain',
      'do you know psg',
      'what is psg',
      'tell me about psg',
    ],
    responses: [
      'Paris Saint-Germain, commonly known as PSG, is a professional football club based in Paris, France.',
      'PSG is one of the most successful football clubs in French football history.',
      'Paris Saint-Germain regularly competes in domestic and European competitions.',
    ],
  },
]
