// ================================================================
// WORDS DATABASE — Imposter Game
// 100+ words with Unsplash image URLs
// ================================================================

const WORDS = [
  // Animals
  { word: "Elephant",    category: "Animals",    image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600&q=80" },
  { word: "Tiger",       category: "Animals",    image: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=600&q=80" },
  { word: "Penguin",     category: "Animals",    image: "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=600&q=80" },
  { word: "Dolphin",     category: "Animals",    image: "https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&q=80" },
  { word: "Giraffe",     category: "Animals",    image: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=600&q=80" },
  { word: "Lion",        category: "Animals",    image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&q=80" },
  { word: "Panda",       category: "Animals",    image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=600&q=80" },
  { word: "Shark",       category: "Animals",    image: "https://images.unsplash.com/photo-1560275619-4cc5fa59d3ae?w=600&q=80" },
  { word: "Eagle",       category: "Animals",    image: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600&q=80" },
  { word: "Gorilla",     category: "Animals",    image: "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?w=600&q=80" },
  { word: "Flamingo",    category: "Animals",    image: "https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=600&q=80" },
  { word: "Cheetah",     category: "Animals",    image: "https://images.unsplash.com/photo-1544985361-b420d7a77043?w=600&q=80" },

  // Food
  { word: "Pizza",       category: "Food",       image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80" },
  { word: "Sushi",       category: "Food",       image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&q=80" },
  { word: "Burger",      category: "Food",       image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
  { word: "Tacos",       category: "Food",       image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80" },
  { word: "Ice Cream",   category: "Food",       image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80" },
  { word: "Mango",       category: "Food",       image: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80" },
  { word: "Cake",        category: "Food",       image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80" },
  { word: "Ramen",       category: "Food",       image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80" },
  { word: "Steak",       category: "Food",       image: "https://images.unsplash.com/photo-1588347818036-bf892a3c45ab?w=600&q=80" },
  { word: "Spaghetti",   category: "Food",       image: "https://images.unsplash.com/photo-1589227365533-cee630bd59bd?w=600&q=80" },
  { word: "Donut",       category: "Food",       image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80" },
  { word: "Croissant",   category: "Food",       image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80" },

  // Transport
  { word: "Airplane",    category: "Transport",  image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80" },
  { word: "Bicycle",     category: "Transport",  image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80" },
  { word: "Helicopter",  category: "Transport",  image: "https://images.unsplash.com/photo-1547055442-9cde8b2d34bf?w=600&q=80" },
  { word: "Sailboat",    category: "Transport",  image: "https://images.unsplash.com/photo-1519011985187-444d62641929?w=600&q=80" },
  { word: "Train",       category: "Transport",  image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&q=80" },
  { word: "Submarine",   category: "Transport",  image: "https://images.unsplash.com/photo-1611533453851-1a4a3fc44da5?w=600&q=80" },
  { word: "Motorcycle",  category: "Transport",  image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  { word: "Hot Air Balloon", category: "Transport", image: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=600&q=80" },
  { word: "Rocket",      category: "Transport",  image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=600&q=80" },

  // Nature
  { word: "Volcano",     category: "Nature",     image: "https://images.unsplash.com/photo-1565703118553-f5f15d5bfa8b?w=600&q=80" },
  { word: "Waterfall",   category: "Nature",     image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600&q=80" },
  { word: "Rainbow",     category: "Nature",     image: "https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=600&q=80" },
  { word: "Desert",      category: "Nature",     image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80" },
  { word: "Glacier",     category: "Nature",     image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80" },
  { word: "Tornado",     category: "Nature",     image: "https://images.unsplash.com/photo-1523785949820-4de36c5e6b12?w=600&q=80" },
  { word: "Northern Lights", category: "Nature", image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&q=80" },
  { word: "Coral Reef",  category: "Nature",     image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=600&q=80" },

  // Sports
  { word: "Football",    category: "Sports",     image: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=80" },
  { word: "Basketball",  category: "Sports",     image: "https://images.unsplash.com/photo-1546519638405-a9d1b2d5e2a4?w=600&q=80" },
  { word: "Tennis",      category: "Sports",     image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80" },
  { word: "Swimming",    category: "Sports",     image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80" },
  { word: "Skateboard",  category: "Sports",     image: "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=600&q=80" },
  { word: "Skiing",      category: "Sports",     image: "https://images.unsplash.com/photo-1519592748817-2e3b30e9c6dc?w=600&q=80" },
  { word: "Boxing",      category: "Sports",     image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=80" },
  { word: "Surfing",     category: "Sports",     image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80" },

  // Objects
  { word: "Camera",      category: "Objects",    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80" },
  { word: "Laptop",      category: "Objects",    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80" },
  { word: "Guitar",      category: "Objects",    image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80" },
  { word: "Telescope",   category: "Objects",    image: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=600&q=80" },
  { word: "Piano",       category: "Objects",    image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&q=80" },
  { word: "Crown",       category: "Objects",    image: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80" },
  { word: "Compass",     category: "Objects",    image: "https://images.unsplash.com/photo-1581922819941-6ab31ab79afc?w=600&q=80" },
  { word: "Hourglass",   category: "Objects",    image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&q=80" },
  { word: "Lightsaber",  category: "Objects",    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80" },
  { word: "Microscope",  category: "Objects",    image: "https://images.unsplash.com/photo-1532094349884-543559c8d31b?w=600&q=80" },

  // Places
  { word: "Pyramid",     category: "Places",     image: "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&q=80" },
  { word: "Lighthouse",  category: "Places",     image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80" },
  { word: "Castle",      category: "Places",     image: "https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=600&q=80" },
  { word: "Library",     category: "Places",     image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" },
  { word: "Stadium",     category: "Places",     image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80" },
  { word: "Submarine Base", category: "Places",  image: "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=600&q=80" },
  { word: "Colosseum",   category: "Places",     image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80" },
  { word: "Eiffel Tower",category: "Places",     image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&q=80" },

  // Professions
  { word: "Astronaut",   category: "Professions",image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80" },
  { word: "Chef",        category: "Professions",image: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=600&q=80" },
  { word: "Firefighter", category: "Professions",image: "https://images.unsplash.com/photo-1587534773956-3e7bf3daabfb?w=600&q=80" },
  { word: "Surgeon",     category: "Professions",image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&q=80" },
  { word: "Knight",      category: "Professions",image: "https://images.unsplash.com/photo-1544985361-b420d7a77043?w=600&q=80" },
  { word: "Magician",    category: "Professions",image: "https://images.unsplash.com/photo-1503455637927-730bce8583c0?w=600&q=80" },
  { word: "Ninja",       category: "Professions",image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80" },
  { word: "Pirate",      category: "Professions",image: "https://images.unsplash.com/photo-1599583863916-e06c29087f51?w=600&q=80" },

  // Science / Space
  { word: "Black Hole",  category: "Space",      image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&q=80" },
  { word: "Moon",        category: "Space",      image: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600&q=80" },
  { word: "Mars",        category: "Space",      image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&q=80" },
  { word: "Comet",       category: "Space",      image: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&q=80" },
  { word: "Nebula",      category: "Space",      image: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=600&q=80" },
  { word: "Satellite",   category: "Space",      image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&q=80" },

  // Fantasy / Fun
  { word: "Dragon",      category: "Fantasy",    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80" },
  { word: "Mermaid",     category: "Fantasy",    image: "https://images.unsplash.com/photo-1570975640108-10a3e76e498e?w=600&q=80" },
  { word: "Treasure Chest", category: "Fantasy", image: "https://images.unsplash.com/photo-1531476400843-1e8e0b67c71a?w=600&q=80" },
  { word: "Unicorn",     category: "Fantasy",    image: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=600&q=80" },
  { word: "Ghost",       category: "Fantasy",    image: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&q=80" },

  // Technology
  { word: "Robot",       category: "Technology", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80" },
  { word: "Drone",       category: "Technology", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&q=80" },
  { word: "VR Headset",  category: "Technology", image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=600&q=80" },
  { word: "3D Printer",  category: "Technology", image: "https://images.unsplash.com/photo-1655393001768-d946c97d6fd1?w=600&q=80" },

  // Extras to hit 100+
  { word: "Pyramid",     category: "Landmarks",  image: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80" },
  { word: "Accordion",   category: "Music",      image: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=600&q=80" },
  { word: "Hammock",     category: "Lifestyle",  image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80" },
  { word: "Candle",      category: "Objects",    image: "https://images.unsplash.com/photo-1530018352490-c6eef07fd7e0?w=600&q=80" },
  { word: "Umbrella",    category: "Objects",    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80" },
  { word: "Cactus",      category: "Nature",     image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=80" },
  { word: "Snowflake",   category: "Nature",     image: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=600&q=80" },
  { word: "Sunflower",   category: "Nature",     image: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=600&q=80" },
  { word: "Diamond",     category: "Objects",    image: "https://images.unsplash.com/photo-1515630278258-407f66498911?w=600&q=80" },
  { word: "Lantern",     category: "Objects",    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80" },
];

// Sanity check
console.log(`📚 Words loaded: ${WORDS.length}`);
