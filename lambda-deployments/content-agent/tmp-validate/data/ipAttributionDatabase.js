"use strict";
/**
 * IP Attribution Database
 *
 * Maps copyrighted characters to their franchises and owners.
 * Used by IPDetectionService to identify and attribute IP in stories.
 *
 * Based on global research for kids ages 3-10:
 * - Tier A: Global giants (Disney, Marvel, LEGO, Barbie, Spider-Man, Minecraft, Roblox, PAW Patrol, Pokémon, Frozen)
 * - Tier B: Behaviorally huge (Bluey, SpongeBob, Peppa Pig, Masha and the Bear)
 * - Age 3-5: Bluey, PAW Patrol, Peppa Pig, Masha and the Bear, Disney preschool, Pocoyo
 * - Age 6-10: Pokémon, Minecraft, Roblox, Spider-Man/Marvel, LEGO, Frozen/Disney, SpongeBob
 * - Anime & International: Doraemon (0-10), Naruto (7-10), One Piece (7-10), Little Witch Academia (6-10), Dragon Ball (7-10)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IP_ATTRIBUTION_DB = void 0;
exports.getIPAttribution = getIPAttribution;
exports.getCharactersByFranchise = getCharactersByFranchise;
exports.fuzzyMatchIP = fuzzyMatchIP;
exports.IP_ATTRIBUTION_DB = {
    // Marvel Characters
    'Spiderman': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Spider-Man', 'Spider Man', 'Peter Parker'] },
    'Spider-Man': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Spiderman', 'Spider Man', 'Peter Parker'] },
    'Spider Man': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Spiderman', 'Spider-Man', 'Peter Parker'] },
    'Peter Parker': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Spiderman', 'Spider-Man'] },
    'Iron Man': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Tony Stark'] },
    'Tony Stark': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Iron Man'] },
    'Captain America': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Steve Rogers', 'Cap'] },
    'Steve Rogers': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Captain America', 'Cap'] },
    'Thor': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Hulk': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Bruce Banner'] },
    'Bruce Banner': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Hulk'] },
    'Black Widow': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Natasha Romanoff'] },
    'Natasha Romanoff': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Black Widow'] },
    'Wolverine': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Logan'] },
    'Logan': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Wolverine'] },
    'Deadpool': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Captain Marvel': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Carol Danvers'] },
    'Black Panther': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['T\'Challa'] },
    'Doctor Strange': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Ant-Man': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Wasp': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Falcon': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Winter Soldier': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Bucky Barnes'] },
    'Scarlet Witch': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Wanda Maximoff'] },
    'Vision': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Loki': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Groot': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Rocket Raccoon': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Star-Lord': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Peter Quill'] },
    'Gamora': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Drax': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Miles Morales': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
    'Ms. Marvel': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Kamala Khan'] },
    'Kamala Khan': { franchise: 'Marvel', owner: 'Marvel Comics (Disney)', variants: ['Ms. Marvel'] },
    // DC Comics Characters
    'Batman': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Bruce Wayne', 'The Dark Knight'] },
    'Bruce Wayne': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Batman', 'The Dark Knight'] },
    'The Dark Knight': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Batman', 'Bruce Wayne'] },
    'Superman': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Clark Kent', 'Kal-El'] },
    'Clark Kent': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Superman', 'Kal-El'] },
    'Wonder Woman': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Diana Prince'] },
    'Diana Prince': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Wonder Woman'] },
    'The Flash': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Barry Allen', 'Flash'] },
    'Barry Allen': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['The Flash', 'Flash'] },
    'Flash': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['The Flash', 'Barry Allen'] },
    'Green Lantern': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Hal Jordan'] },
    'Aquaman': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Arthur Curry'] },
    'Cyborg': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
    'Green Arrow': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Oliver Queen'] },
    'Harley Quinn': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
    'Joker': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
    'Catwoman': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Selina Kyle'] },
    'Robin': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Dick Grayson', 'Tim Drake', 'DC Robin'] },
    'Nightwing': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Dick Grayson'] },
    'Batgirl': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Barbara Gordon'] },
    'Supergirl': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Kara Zor-El'] },
    'Shazam': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)', variants: ['Captain Marvel'] },
    'Black Canary': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
    'Martian Manhunter': { franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
    // Disney Characters
    'Elsa': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Queen Elsa'] },
    'Queen Elsa': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Elsa'] },
    'Anna': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Anna'] },
    'Princess Anna': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Anna'] },
    'Olaf': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Mickey Mouse': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Mickey'] },
    'Mickey': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Mickey Mouse'] },
    'Minnie Mouse': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Minnie'] },
    'Minnie': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Minnie Mouse'] },
    'Donald Duck': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Donald'] },
    'Goofy': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Pluto': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Cinderella': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Snow White': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Ariel': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['The Little Mermaid', 'Princess Ariel'] },
    'The Little Mermaid': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Ariel', 'Princess Ariel'] },
    'Belle': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Belle'] },
    'Jasmine': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Jasmine'] },
    'Mulan': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Mulan'] },
    'Tiana': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Tiana'] },
    'Rapunzel': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Rapunzel'] },
    'Merida': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Princess Merida'] },
    'Moana': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Frozen': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Simba': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Nala': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Timon': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Pumbaa': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Buzz Lightyear': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Buzz'] },
    'Woody': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Nemo': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Dory': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Mike Wazowski': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Mike'] },
    'Sulley': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Wreck-It Ralph': { franchise: 'Disney', owner: 'The Walt Disney Company', variants: ['Ralph'] },
    'Vanellope': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Baymax': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    'Hiro': { franchise: 'Disney', owner: 'The Walt Disney Company' },
    // Harry Potter (Warner Bros.)
    'Harry Potter': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Harry'] },
    'Harry': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Harry Potter'] },
    'Hermione Granger': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Hermione'] },
    'Hermione': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Hermione Granger'] },
    'Ron Weasley': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Ron'] },
    'Ron': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Ron Weasley'] },
    'Dumbledore': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
    'Voldemort': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
    'Hagrid': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
    'Snape': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment', variants: ['Professor Snape'] },
    'Hogwarts': { franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
    // Tier A: Global Giants (Ages 3-10)
    // LEGO
    'LEGO': { franchise: 'LEGO', owner: 'The LEGO Group' },
    'Lego': { franchise: 'LEGO', owner: 'The LEGO Group' },
    // Barbie
    'Barbie': { franchise: 'Barbie', owner: 'Mattel', variants: ['Barbie Doll'] },
    // Minecraft
    'Minecraft': { franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
    'Steve': { franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
    'Alex': { franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
    'Creeper': { franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
    'Enderman': { franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
    // Roblox
    'Roblox': { franchise: 'Roblox', owner: 'Roblox Corporation' },
    // PAW Patrol
    'PAW Patrol': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)', variants: ['Paw Patrol'] },
    'Paw Patrol': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)', variants: ['PAW Patrol'] },
    'Chase': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Marshall': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Skye': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Rubble': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Rocky': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Zuma': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    'Ryder': { franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
    // Pokémon (Expanded)
    'Pikachu': { franchise: 'Pokémon', owner: 'The Pokémon Company' },
    'Pokemon': { franchise: 'Pokémon', owner: 'The Pokémon Company' },
    'Pokémon': { franchise: 'Pokémon', owner: 'The Pokémon Company' },
    'Ash Ketchum': { franchise: 'Pokémon', owner: 'The Pokémon Company', variants: ['Ash', 'Satoshi'] },
    'Ash': { franchise: 'Pokémon', owner: 'The Pokémon Company', variants: ['Ash Ketchum', 'Satoshi'] },
    'Charizard': { franchise: 'Pokémon', owner: 'The Pokémon Company' },
    // Tier B: Behaviorally Huge (Ages 3-10)
    // Bluey
    'Bluey': { franchise: 'Bluey', owner: 'BBC Studios (Ludo Studio)', variants: ['Bluey Heeler'] },
    'Bingo': { franchise: 'Bluey', owner: 'BBC Studios (Ludo Studio)', variants: ['Bingo Heeler'] },
    'Bandit': { franchise: 'Bluey', owner: 'BBC Studios (Ludo Studio)', variants: ['Bandit Heeler'] },
    'Chilli': { franchise: 'Bluey', owner: 'BBC Studios (Ludo Studio)', variants: ['Chilli Heeler'] },
    // SpongeBob SquarePants
    'SpongeBob': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['SpongeBob SquarePants', 'Spongebob'] },
    'SpongeBob SquarePants': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['SpongeBob', 'Spongebob'] },
    'Spongebob': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['SpongeBob', 'SpongeBob SquarePants'] },
    'Patrick Star': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['Patrick'] },
    'Squidward': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['Squidward Tentacles'] },
    'Gary': { franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)', variants: ['Gary the Snail'] },
    // Peppa Pig
    'Peppa Pig': { franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)', variants: ['Peppa'] },
    'Peppa': { franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)', variants: ['Peppa Pig'] },
    'George Pig': { franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)', variants: ['George'] },
    'Mummy Pig': { franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)' },
    'Daddy Pig': { franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)' },
    // Masha and the Bear
    'Masha': { franchise: 'Masha and the Bear', owner: 'Animaccord', variants: ['Masha and the Bear'] },
    'Masha and the Bear': { franchise: 'Masha and the Bear', owner: 'Animaccord', variants: ['Masha'] },
    'The Bear': { franchise: 'Masha and the Bear', owner: 'Animaccord', variants: ['Bear'] },
    // Anime & International IP (Ages 0-10)
    // Doraemon
    'Doraemon': { franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)', variants: ['Doraemon the Robot Cat'] },
    'Nobita': { franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)', variants: ['Nobita Nobi'] },
    'Shizuka': { franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)', variants: ['Shizuka Minamoto'] },
    'Gian': { franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)', variants: ['Takeshi Goda'] },
    'Suneo': { franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)', variants: ['Suneo Honekawa'] },
    // Naruto (Expanded)
    'Naruto': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Naruto Uzumaki'] },
    'Naruto Uzumaki': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Naruto'] },
    'Sasuke': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Sasuke Uchiha'] },
    'Sasuke Uchiha': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Sasuke'] },
    'Sakura': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Sakura Haruno'] },
    'Sakura Haruno': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Sakura'] },
    'Kakashi': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Kakashi Hatake'] },
    'Kakashi Hatake': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Kakashi'] },
    'Hinata': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Hinata Hyuga'] },
    'Hinata Hyuga': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Hinata'] },
    'Shikamaru': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Shikamaru Nara'] },
    'Rock Lee': { franchise: 'Naruto', owner: 'Shueisha' },
    'Neji': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Neji Hyuga'] },
    'Gaara': { franchise: 'Naruto', owner: 'Shueisha' },
    'Jiraiya': { franchise: 'Naruto', owner: 'Shueisha' },
    'Itachi': { franchise: 'Naruto', owner: 'Shueisha', variants: ['Itachi Uchiha'] },
    // One Piece
    'Luffy': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Monkey D. Luffy', 'Straw Hat Luffy'] },
    'Monkey D. Luffy': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Luffy', 'Straw Hat Luffy'] },
    'Zoro': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Roronoa Zoro'] },
    'Roronoa Zoro': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Zoro'] },
    'Nami': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    'Usopp': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    'Sanji': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Vinsmoke Sanji'] },
    'Chopper': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Tony Tony Chopper'] },
    'Nico Robin': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)', variants: ['Robin'] },
    'Franky': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    'Brook': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    'Jinbe': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    'One Piece': { franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
    // Little Witch Academia
    'Atsuko Kagari': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)', variants: ['Akko', 'Atsuko'] },
    'Akko': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)', variants: ['Atsuko Kagari', 'Atsuko'] },
    'Diana Cavendish': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)', variants: ['Diana'] },
    'Sucy Manbavaran': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)', variants: ['Sucy'] },
    'Lotte Jansson': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)', variants: ['Lotte'] },
    'Little Witch Academia': { franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)' },
    // Pocoyo
    'Pocoyo': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment', variants: ['Pocoyó'] },
    'Pocoyó': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment', variants: ['Pocoyo'] },
    'Pato': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment' },
    'Elly': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment' },
    'Sleepy Bird': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment' },
    'Loula': { franchise: 'Pocoyo', owner: 'Zinkia Entertainment' },
    // Dragon Ball (Expanded)
    'Goku': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Son Goku', 'Kakarot'] },
    'Son Goku': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Goku', 'Kakarot'] },
    'Vegeta': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Prince Vegeta'] },
    'Gohan': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Son Gohan'] },
    'Piccolo': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Krillin': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Bulma': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Trunks': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Goten': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Son Goten'] },
    'Frieza': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Cell': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    'Majin Buu': { franchise: 'Dragon Ball', owner: 'Shueisha', variants: ['Buu'] },
    'Dragon Ball': { franchise: 'Dragon Ball', owner: 'Shueisha' },
    // Other Popular Characters
    'Sonic': { franchise: 'Sonic the Hedgehog', owner: 'Sega', variants: ['Sonic the Hedgehog'] },
    'Mario': { franchise: 'Super Mario', owner: 'Nintendo', variants: ['Super Mario', 'Mario Bros'] },
    'Super Mario': { franchise: 'Super Mario', owner: 'Nintendo', variants: ['Mario', 'Mario Bros'] },
    'Link': { franchise: 'The Legend of Zelda', owner: 'Nintendo' },
};
/**
 * Get IP attribution for a character name
 * @param characterName - The character name to look up
 * @returns IP attribution entry if found, null otherwise
 */
function getIPAttribution(characterName) {
    const normalizedName = characterName.trim();
    // Direct lookup
    if (exports.IP_ATTRIBUTION_DB[normalizedName]) {
        return exports.IP_ATTRIBUTION_DB[normalizedName];
    }
    // Case-insensitive lookup
    const lowerName = normalizedName.toLowerCase();
    for (const [key, value] of Object.entries(exports.IP_ATTRIBUTION_DB)) {
        if (key.toLowerCase() === lowerName) {
            return value;
        }
        // Check variants
        if (value.variants?.some(v => v.toLowerCase() === lowerName)) {
            return value;
        }
    }
    return null;
}
/**
 * Get all character names for a franchise
 * @param franchise - The franchise name
 * @returns Array of character names
 */
function getCharactersByFranchise(franchise) {
    return Object.entries(exports.IP_ATTRIBUTION_DB)
        .filter(([_, entry]) => entry.franchise === franchise)
        .map(([name]) => name);
}
/**
 * Check if a character name matches any IP (fuzzy matching)
 * @param characterName - The character name to check
 * @returns IP attribution entry if found, null otherwise
 */
function fuzzyMatchIP(characterName) {
    const normalizedName = characterName.trim().toLowerCase();
    // Exact match (case-insensitive)
    const exact = getIPAttribution(characterName);
    if (exact)
        return exact;
    // Partial match (contains)
    for (const [key, value] of Object.entries(exports.IP_ATTRIBUTION_DB)) {
        const keyLower = key.toLowerCase();
        if (normalizedName.includes(keyLower) || keyLower.includes(normalizedName)) {
            return value;
        }
        // Check variants
        if (value.variants?.some(v => {
            const vLower = v.toLowerCase();
            return normalizedName.includes(vLower) || vLower.includes(normalizedName);
        })) {
            return value;
        }
    }
    return null;
}
