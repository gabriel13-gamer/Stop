import { firstLetter, normalizeAnswer } from "../utils.ts";

const RAW: Record<string, string[]> = {
  nome: [
    "Ana","Alice","Andre","Antonio","Beatriz","Bruno","Carlos","Catarina","Daniel","Diana",
    "Eduardo","Eva","Filipa","Francisco","Gabriel","Goncalo","Helena","Hugo","Ines","Isabel",
    "Joao","Joana","Jose","Lara","Leonor","Luis","Manuel","Maria","Miguel","Marta",
    "Nuno","Nadia","Olivia","Oscar","Pedro","Paula","Rafael","Rita","Sara","Sofia",
    "Tiago","Teresa","Ulisses","Ursula","Vasco","Vera","Xavier","Xana","Yara","Yago","Zeca","Zulmira",
    "Afonso","Amanda","Bernardo","Camila","Diogo","Elisa","Fabio","Gustavo","Henrique","Igor",
    "Juliana","Kevin","Laura","Mateus","Nicole","Otavio","Patricia","Renata","Sergio","Tatiana",
  ],
  apelido: [
    "Almeida","Alves","Araujo","Barbosa","Barros","Campos","Cardoso","Carvalho","Castro","Costa",
    "Dias","Duarte","Fernandes","Ferreira","Figueiredo","Gomes","Goncalves","Lima","Lopes","Machado",
    "Marques","Martins","Mendes","Melo","Monteiro","Moreira","Nunes","Oliveira","Pereira","Pinto",
    "Ramos","Reis","Ribeiro","Rocha","Rodrigues","Santos","Silva","Soares","Sousa","Teixeira",
    "Vieira","Nascimento","Neves","Moura","Macedo","Freitas","Correia","Cunha","Batista","Azevedo",
  ],
  animal: [
    "abelha","aguia","alce","anta","avestruz","baleia","borboleta","bufalo","cabra","cachorro",
    "camelo","canguru","capivara","cavalo","cobra","coelho","crocodilo","elefante","emu","flamingo",
    "foca","formiga","gato","girafa","golfinho","gorila","guaxinim","hipopotamo","hiena","iguana",
    "impala","jaguar","jacare","javali","leao","leopardo","lobo","lontra","macaco","mamute",
    "morsa","mosca","naja","narval","orangotango","orca","ostra","panda","pantera","papagaio",
    "pato","pavao","pinguim","raposa","rinoceronte","sagui","sapo","tigre","touro","urso",
    "vaca","veado","zebra","zorrilho",
  ],
  pais: [
    "angola","alemanha","argentina","australia","austria","belgica","bolivia","brasil","canada","chile",
    "china","colombia","coreia","cuba","dinamarca","egito","espanha","estados unidos","etiopia","finlandia",
    "franca","grecia","guatemala","haiti","holanda","hungria","india","indonesia","inglaterra","irao",
    "irlanda","islandia","israel","italia","japao","jordania","kuwait","laos","libano","lituania",
    "marrocos","mexico","mocambique","mongolia","nigeria","noruega","nova zelandia","panama","paraguai","peru",
    "polonia","portugal","qatar","quenia","romenia","russia","senegal","suecia","suica","tailandia",
    "tunisia","turquia","ucrania","uganda","uruguai","venezuela","vietname","zambia","zimbabwe",
  ],
  cidade: [
    "aveiro","amadora","amsterdao","atenas","barcelona","beja","belem","berlim","bilbao","braga",
    "brasilia","bruxelas","cairo","cascais","chicago","coimbra","curitiba","dakar","dublin","dubai",
    "evora","faro","figueira","florenca","fortaleza","funchal","genebra","guimaraes","helsinquia","houston",
    "londres","lisboa","lyon","madrid","malaga","manchester","maputo","miami","milao","montreal",
    "nairobi","napoles","nova iorque","oporto","oslo","ottawa","paris","pequim","porto","porto alegre",
    "recife","rio de janeiro","roma","salvador","santarem","sevilha","sintra","toquio","toronto","valencia",
    "varna","veneza","viena","viseu","washington","zaragoza",
  ],
  comida: [
    "acai","alface","arroz","atum","abacate","bacalhau","banana","batata","bife","bolo",
    "camarao","carne","cereal","chocolate","churrasco","couve","doce","donut","empada","escondidinho",
    "feijoada","figo","francesinha","fruta","gelado","gema","hamburguer","homus","iogurte","jelly",
    "jaca","jenipapo","kiwi","lasanha","limao","macarrao","maca","manga","melancia","melao",
    "morango","nhoque","noz","omelete","ostra","pao","pastel","peixe","pizza","queijo",
    "quinoa","risoto","salada","sopa","taco","tapioca","uva","waffle","yakisoba","azeitona",
  ],
  bebida: [
    "agua","absinto","aguardente","cafe","cha","cerveja","cidra","coca-cola","cocktail","conhaque",
    "gim","guarana","horchata","ice tea","leite","limonada","licor","mate","nectar","sumo",
    "vinho","vodka","uisque","whisky","refrigerante","smoothie","sangria","sidra","tonic","kombucha",
  ],
  profissao: [
    "advogado","arquiteto","ator","barbeiro","bombeiro","cantor","carpinteiro","cientista","cozinheiro","dentista",
    "designer","eletricista","enfermeiro","engenheiro","escritor","farmaceutico","fotografo","jornalista","juiz","medico",
    "motorista","musico","piloto","pintor","policia","professor","programador","psicologo","veterinario","vendedor",
  ],
  objeto: [
    "agulha","almofada","anel","banco","bola","cadeira","caderno","caneta","chave","colher",
    "copo","dado","escova","espelho","estojo","faca","garfo","garrafa","guitarra","janela",
    "lampada","livro","mala","martelo","mesa","mochila","oculos","papel","pente","porta",
    "relogio","saco","tesoura","telefone","toalha","vaso","ventilador","xicara","isqueiro","teclado",
  ],
  marca: [
    "adidas","amazon","apple","audi","bmw","cocacola","colgate","dell","disney","ferrari",
    "ford","google","honda","ikea","intel","lego","lg","microsoft","motorola","nestle",
    "netflix","nike","nintendo","nokia","pepsi","playstation","samsung","sony","spotify","tesla",
    "toyota","uber","volvo","xiaomi","yamaha","zara","gucci","chanel","prada","hermes",
  ],
  filme: [
    "avatar","alien","amadeus","batman","braveheart","casablanca","clube da luta","duna","et","frozen",
    "gladiador","gone girl","harry potter","inception","interestelar","jaws","joker","king kong","leon","matrix",
    "moana","narnia","oppenheimer","origin","parasita","pulp fiction","rocky","seven","shrek","titanic",
    "up","vertigo","whiplash","x-men","yesterday","zootopia","mad max","moonlight","frozen","coco",
  ],
  serie: [
    "andor","arcane","breaking bad","bridgerton","chernobyl","dark","euphoria","friends","game of thrones","house",
    "lost","loki","mandalorian","narcos","ozark","peaky blinders","queen gambit","rick and morty","stranger things","succession",
    "the office","the wire","vikings","westworld","yellowstone","you","seinfeld","sherlock","supernatural","twilight zone",
  ],
  jogo: [
    "among us","apex","bioshock","celeste","counter strike","doom","elden ring","fifa","fortnite","gta",
    "halo","it takes two","jedi","zelda","minecraft","overwatch","portal","quake","rocket league","skyrim",
    "tetris","uncharted","valorant","warcraft","xcom","yakuza","zelda","pokemon","mario","sonic",
  ],
  personagem: [
    "asterix","batman","bowser","cinderela","darth vader","elsa","frodo","gandalf","harry potter","iron man",
    "joker","kratos","link","mario","naruto","optimus","pikachu","quico","robin","shrek",
    "thor","ursula","vegeta","wolverine","yoda","zelda","sherlock","simba","moana","mulan",
  ],
  desporto: [
    "andebol","atletismo","badminton","basebol","basquetebol","boxear","canoagem","ciclismo","esgrima","futebol",
    "ginastica","golfe","hoquei","judo","karate","levantamento","luta","natacao","padel","polo",
    "remo","rugby","skate","snowboard","tenis","voleibol","surf","xadrez","yoga","windsurf",
  ],
  clube: [
    "arsenal","ajax","barcelona","benfica","bocajuniors","chelsea","dortmund","everton","flamengo","porto",
    "juventus","liverpool","milan","napoli","olympique","psg","real madrid","sporting","tottenham","valencia",
    "inter","bayern","santos","palmeiras","corinthians","braga","boavista","maritimo","vitoria","nacional",
  ],
  celebridade: [
    "adele","almodovar","beyonce","brad pitt","cristiano ronaldo","drake","einstein","freddie mercury","gal gadot","harry styles",
    "ibrahimovic","jennifer","keanu","lady gaga","madonna","neymar","obama","picasso","queen","rihanna",
    "shakira","taylor swift","usher","vin diesel","will smith","zendaya","messi","oprah","spielberg","tarantino",
  ],
  planta: [
    "acacia","alface","alecrim","bambu","bananeira","cacto","camelia","carvalho","cedro","dalia",
    "eucalipto","fetos","girassol","hortensia","ipomeia","jasmim","kiwi","lavanda","lirio","magnolia",
    "nogueira","oliveira","orquidea","palmeira","pinheiro","roseira","salgueiro","tomateiro","uva","violeta",
  ],
  corpo: [
    "antebraco","aorta","boca","braco","cabeca","coracao","coluna","dedo","dente","estomago",
    "figado","garganta","joelho","lingua","mao","maxilar","nariz","olho","ombro","pele",
    "pulmao","rim","sangue","tornozelo","unha","vertebra","veia","cerebro","pescoco",
  ],
  tecnologia: [
    "algoritmo","android","antenna","bluetooth","chip","computador","drone","email","firmware","gadget",
    "hardware","internet","javascript","keyboard","laptop","modem","nanotecnologia","oled","processador","quantum",
    "robot","servidor","teclado","usb","virtualizacao","wifi","xml","youtube","zoom","sensor",
  ],
  aplicacao: [
    "amazon","android","behance","chrome","discord","excel","facebook","gmail","instagram","jira",
    "linkedin","maps","netflix","outlook","photoshop","quizlet","reddit","spotify","telegram","tiktok",
    "uber","vlc","whatsapp","xcode","youtube","zoom","slack","notion","figma","canva",
  ],
  veiculo: [
    "ambulance","aviao","autocarro","bicicleta","barco","camioneta","carro","comboio","drone","ferrari",
    "helicoptero","hovercraft","jet ski","kart","limusine","metro","motociclo","navio","onibus","patinete",
    "quadriciclo","rebocador","scooter","taxi","trator","van","vespa","iate","zamboni","camioneta",
  ],
};

function fold(s: string): string {
  return normalizeAnswer(s);
}

const INDEX = new Map<string, Map<string, string[]>>();
for (const [cat, words] of Object.entries(RAW)) {
  const byLetter = new Map<string, string[]>();
  for (const w of words) {
    const L = firstLetter(w);
    if (!L) continue;
    const list = byLetter.get(L) ?? [];
    list.push(w);
    byLetter.set(L, list);
  }
  INDEX.set(cat, byLetter);
}

export function dictionaryWords(categoryId: string): string[] {
  return RAW[categoryId] ?? [];
}

export function wordsFor(categoryId: string, letter: string): string[] {
  const base = categoryId.startsWith("custom:") ? [] : (INDEX.get(categoryId)?.get(letter.toUpperCase()) ?? []);
  return base;
}

export function inDictionary(categoryId: string, answer: string): boolean {
  if (categoryId.startsWith("custom:")) return false;
  const n = fold(answer);
  if (!n) return false;
  const list = RAW[categoryId];
  if (!list) return false;
  return list.some((w) => fold(w) === n || fold(w).startsWith(n) || n.startsWith(fold(w)));
}

export function pickWord(categoryId: string, letter: string, avoid: Set<string> = new Set()): string | null {
  const options = wordsFor(categoryId, letter).filter((w) => !avoid.has(fold(w)));
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

export const KNOWN_CATEGORY_IDS = Object.keys(RAW);
