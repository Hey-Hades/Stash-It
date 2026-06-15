import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

import {
  pokemonCharacters,
  marvelCharacters,
  dcCharacters,
  planets,
  chemicalElements,
  weirdVocab,
  shortWords,
  techStack,
  algoTerms
} from "./dictionary.js";

// 1. Bring back crypto to generate the '123456' part
import crypto from "crypto";
import { shuffleArray } from "./utils.js";

const generatePassKey = () => {
  const customDictionaries = [
    dcCharacters,
    animals,
    marvelCharacters,
    colors,
    pokemonCharacters,
    planets,
    chemicalElements,
    weirdVocab,
    shortWords,
    techStack,
    algoTerms
  ];

  const randomDictionaries = shuffleArray([...customDictionaries]);

  // 2. Generate exactly 2 words (e.g., "happy-batman")
  const cleanWords = uniqueNamesGenerator({
    dictionaries: [adjectives, randomDictionaries[0]], 
    length: 2,
    style: "lowerCase",
    separator: "-", 
  });

  // 3. Generate the 6-character hex string (e.g., "a1b2c3")
  const hexString = crypto.randomBytes(3).toString("hex");

  // 4. Combine them to perfectly match your word-word-123456 format
  return `${cleanWords}-${hexString}`;
};

export default generatePassKey;