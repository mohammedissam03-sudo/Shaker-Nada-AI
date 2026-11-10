
const characters = {
  male: {
    id: "shaker",
    name: "Shaker",
    arabicName: "شاكر",
    theme: "shaker",
    color: "#2563eb"
  },

  female: {
    id: "nada",
    name: "Nada",
    arabicName: "ندى",
    theme: "nada",
    color: "#ec4899"
  }
};

export function getCharacter(gender) {
  const character = characters[gender];

  if (!character) {
    throw new Error(`Unsupported gender: ${gender}`);
  }

  return character;
}

