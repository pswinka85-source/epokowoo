export interface EpochData {
  id: string;
  name: string;
  period: string;
  shortDesc: string;
  description: string;
  characteristics: string[];
  authors: { name: string; works: string[] }[];
  keyThemes: string[];
  icon: string;
}

export const epochs: EpochData[] = [
  {
    id: "antyk",
    name: "Antyk",
    period: "VIII w. p.n.e. – V w. n.e.",
    shortDesc: "Kolebka cywilizacji europejskiej, filozofii i literatury.",
    icon: "🏛️",
    description:
      "Antyk to epoka, która dała początek europejskiej kulturze i literaturze. Obejmuje starożytną Grecję i Rzym. To właśnie wtedy powstały fundamenty filozofii, teatru, retoryki i poetyki, które wpływają na literaturę do dziś.",
    characteristics: [
      "Antropocentryzm – człowiek w centrum zainteresowania",
      "Mimesis – naśladowanie rzeczywistości w sztuce",
      "Katharsis – oczyszczenie przez współodczuwanie",
      "Ideał kalokagatii – piękno i dobro jako jedność",
      "Tragizm – konflikt między jednostką a losem",
    ],
    authors: [
      { name: "Homer", works: ["Iliada", "Odyseja"] },
      { name: "Sofokles", works: ["Antygona", "Król Edyp"] },
      { name: "Horacy", works: ["Pieśni (Carmina)", "Ars poetica"] },
      { name: "Wergiliusz", works: ["Eneida"] },
    ],
    keyThemes: ["Fatum i los", "Honor i heroizm", "Hybris", "Miłość i cierpienie"],
  },
  {
    id: "sredniowiecze",
    name: "Średniowiecze",
    period: "V – XV w.",
    shortDesc: "Epoka wiary, rycerstwa i teocentryzmu.",
    icon: "⚔️",
    description:
      "Średniowiecze to epoka zdominowana przez religię chrześcijańską. Kultura i literatura koncentrowały się wokół Boga i życia wiecznego. Powstawały dzieła o charakterze dydaktycznym i moralizatorskim.",
    characteristics: [
      "Teocentryzm – Bóg w centrum",
      "Uniwersalizm kulturowy",
      "Dydaktyzm i moralizatorstwo",
      "Anonimowość twórców",
      "Trzy wzorce osobowe: rycerz, święty, władca",
    ],
    authors: [
      { name: "Dante Alighieri", works: ["Boska Komedia"] },
      { name: "Gall Anonim", works: ["Kronika polska"] },
      { name: "Autor anonimowy", works: ["Bogurodzica", "Legenda o św. Aleksym", "Rozmowa Mistrza Polikarpa ze Śmiercią"] },
    ],
    keyThemes: ["Vanitas – marność świata", "Danse macabre", "Ars moriendi", "Wzorce parenetyczne"],
  },
  {
    id: "renesans",
    name: "Renesans",
    period: "XV – XVI w.",
    shortDesc: "Odrodzenie antycznych ideałów, humanizm i radość życia.",
    icon: "🌿",
    description:
      "Renesans oznacza odrodzenie zainteresowania antykiem. Człowiek znów staje w centrum uwagi. To epoka wielkich odkryć, humanizmu i rozkwitu sztuki. W Polsce nazywana \"złotym wiekiem\".",
    characteristics: [
      "Humanizm – godność i wartość człowieka",
      "Powrót do wzorców antycznych",
      "Irenizm – dążenie do pokoju",
      "Reformacja i tolerancja religijna",
      "Rozwój literatury w językach narodowych",
    ],
    authors: [
      { name: "Jan Kochanowski", works: ["Treny", "Pieśni", "Fraszki", "Odprawa posłów greckich"] },
      { name: "Mikołaj Rej", works: ["Krótka rozprawa między trzema osobami", "Żywot człowieka poczciwego"] },
      { name: "William Szekspir", works: ["Hamlet", "Romeo i Julia", "Makbet"] },
    ],
    keyThemes: ["Stoicyzm i epikureizm", "Carpe diem", "Fortuna", "Harmonia człowieka z naturą"],
  },
  {
    id: "barok",
    name: "Barok",
    period: "XVI – XVIII w.",
    shortDesc: "Przepych formy, kontrast, niepokój i sarmatyzm.",
    icon: "👑",
    description:
      "Barok to epoka kontrastów – splendoru i marności, życia i śmierci. W Polsce wiąże się z sarmatyzmem. Literatura barokowa cechuje się bogactwem środków stylistycznych i złożoną formą.",
    characteristics: [
      "Marinizm – ozdobność i kunsztowność formy",
      "Konceptyzm – zaskakujące pomysły literackie",
      "Sarmatyzm w Polsce",
      "Vanitas – motyw przemijania",
      "Kontrast między życiem a śmiercią",
    ],
    authors: [
      { name: "Jan Andrzej Morsztyn", works: ["Do trupa", "Cuda miłości"] },
      { name: "Daniel Naborowski", works: ["Krótkość żywota", "Marność"] },
      { name: "Jan Chryzostom Pasek", works: ["Pamiętniki"] },
      { name: "Wacław Potocki", works: ["Transakcja wojny chocimskiej"] },
    ],
    keyThemes: ["Vanitas vanitatum", "Memento mori", "Kontrast i antyteza", "Sarmatyzm"],
  },
  {
    id: "oswiecenie",
    name: "Oświecenie",
    period: "XVIII w.",
    shortDesc: "Wiek rozumu, racjonalizmu i reform społecznych.",
    icon: "💡",
    description:
      "Oświecenie to epoka rozumu i nauki. Walczono z przesądami, ciemnotą i zacofaniem. W Polsce wiąże się z reformami Sejmu Czteroletniego i Konstytucją 3 maja. Literatura miała charakter dydaktyczny.",
    characteristics: [
      "Racjonalizm – rozum jako podstawa poznania",
      "Empiryzm – doświadczenie jako źródło wiedzy",
      "Klasycyzm w literaturze",
      "Sentymentalizm",
      "Dydaktyzm i utylitaryzm",
    ],
    authors: [
      { name: "Ignacy Krasicki", works: ["Bajki i przypowieści", "Monachomachia", "Mikołaja Doświadczyńskiego przypadki"] },
      { name: "Julian Ursyn Niemcewicz", works: ["Powrót posła"] },
      { name: "Franciszek Karpiński", works: ["Laura i Filon", "Do Justyny"] },
      { name: "Wolter", works: ["Kandyd"] },
    ],
    keyThemes: ["Krytyka społeczna", "Oświecony absolutyzm", "Prawa człowieka", "Edukacja"],
  },
  {
    id: "romantyzm",
    name: "Romantyzm",
    period: "1798–1863",
    shortDesc: "Uczucie, bunt, walka o wolność i potęga wyobraźni.",
    icon: "🌙",
    description:
      "Romantyzm to epoka uczuć, wyobraźni i buntu przeciwko racjonalizmowi. W Polsce łączy się z walką o niepodległość. To czas wielkich wieszczów narodowych i mesjanizmu.",
    characteristics: [
      "Prymat uczucia nad rozumem",
      "Indywidualizm i bunt jednostki",
      "Ludowość – fascynacja kulturą ludową",
      "Mesjanizm – Polska jako Chrystus narodów",
      "Bajronizm – bohater romantyczny",
    ],
    authors: [
      { name: "Adam Mickiewicz", works: ["Dziady", "Pan Tadeusz", "Ballady i romanse", "Konrad Wallenrod"] },
      { name: "Juliusz Słowacki", works: ["Kordian", "Balladyna", "Testament mój"] },
      { name: "Zygmunt Krasiński", works: ["Nie-Boska Komedia"] },
      { name: "Cyprian Kamil Norwid", works: ["Fortepian Szopena", "Bema pamięci żałobny rapsod"] },
    ],
    keyThemes: ["Walka o wolność", "Miłość romantyczna", "Natura i tajemniczość", "Mesjanizm i prometeizm"],
  },
  {
    id: "pozytywizm",
    name: "Pozytywizm",
    period: "1863–1890",
    shortDesc: "Praca u podstaw, scjentyzm i realizm literacki.",
    icon: "⚙️",
    description:
      "Pozytywizm to epoka pracy organicznej i pracy u podstaw. Po klęsce powstania styczniowego odrzucono romantyczne ideały walki zbrojnej na rzecz pracy na rzecz społeczeństwa, edukacji i nauki.",
    characteristics: [
      "Scjentyzm – wiara w naukę",
      "Utylitaryzm – użyteczność jako wartość",
      "Praca organiczna i praca u podstaw",
      "Realizm i naturalizm w literaturze",
      "Emancypacja kobiet i kwestia żydowska",
    ],
    authors: [
      { name: "Bolesław Prus", works: ["Lalka", "Kamizelka", "Katarynka"] },
      { name: "Eliza Orzeszkowa", works: ["Nad Niemnem", "Gloria victis"] },
      { name: "Henryk Sienkiewicz", works: ["Quo vadis", "Potop", "Latarnik"] },
      { name: "Maria Konopnicka", works: ["Rota", "Mendel Gdański"] },
    ],
    keyThemes: ["Praca organiczna", "Asymilacja", "Kwestia kobieca", "Społeczeństwo i jednostka"],
  },
  {
    id: "mloda-polska",
    name: "Młoda Polska",
    period: "1890–1918",
    shortDesc: "Dekadentyzm, symbolizm i sztuka dla sztuki.",
    icon: "🎭",
    description:
      "Młoda Polska to epoka buntu przeciw pozytywistycznemu materializmowi. Artyści szukali piękna, tajemnicy i nowych form wyrazu. Dominowały nastroje dekadenckie i symboliczne.",
    characteristics: [
      "Dekadentyzm – poczucie schyłku",
      "Symbolizm i impresjonizm",
      'Hasło „sztuka dla sztuki"',
      "Fascynacja śmiercią i Erosem",
      "Neoromantyzm – powrót do ideałów romantycznych",
    ],
    authors: [
      { name: "Stanisław Wyspiański", works: ["Wesele", "Noc listopadowa"] },
      { name: "Kazimierz Przerwa-Tetmajer", works: ["Koniec wieku XIX", "Melodia mgieł nocnych"] },
      { name: "Leopold Staff", works: ["Deszcz jesienny", "Kowal"] },
      { name: "Stefan Żeromski", works: ["Ludzie bezdomni", "Przedwiośnie", "Rozdziobią nas kruki, wrony..."] },
    ],
    keyThemes: ["Dekadencja i pesymizm", "Natura jako zwierciadło duszy", "Chłopomania", "Dramat narodowy"],
  },
  {
    id: "dwudziestolecie",
    name: "XX-lecie międzywojenne",
    period: "1918–1939",
    shortDesc: "Awangarda, eksperymenty formalne i katastrofizm.",
    icon: "🎨",
    description:
      "Dwudziestolecie międzywojenne to czas radości z odzyskanej niepodległości, ale i niepokoju przed nadchodzącą katastrofą. Rozkwitały awangardowe kierunki artystyczne i eksperymenty literackie.",
    characteristics: [
      "Pluralizm kierunków artystycznych",
      "Awangarda: futuryzm, ekspresjonizm, surrealizm",
      "Grupa Skamander",
      "Katastrofizm",
      "Groteska i absurd",
    ],
    authors: [
      { name: "Bruno Schulz", works: ["Sklepy cynamonowe", "Sanatorium pod Klepsydrą"] },
      { name: "Witold Gombrowicz", works: ["Ferdydurke"] },
      { name: "Julian Tuwim", works: ["Do prostego człowieka", "Mieszkańcy"] },
      { name: "Stanisław Ignacy Witkiewicz", works: ["Szewcy", "Nienasycenie"] },
      { name: "Bolesław Leśmian", works: ["Dziewczyna", "Topielec"] },
    ],
    keyThemes: ["Katastrofizm", "Forma i konwencja", "Groteska", "Miasto i nowoczesność"],
  },
  {
    id: "wspolczesnosc",
    name: "Współczesność",
    period: "1945 – dziś",
    shortDesc: "Literatura po wojnie, egzystencjalizm i postmodernizm.",
    icon: "📖",
    description:
      "Współczesność to najdłuższa i najbardziej zróżnicowana epoka. Obejmuje literaturę wojenną, socrealizm, pokolenie Kolumbów, Nową Falę, postmodernizm i literaturę najnowszą.",
    characteristics: [
      "Rozliczenie z II wojną światową i Holocaustem",
      "Egzystencjalizm",
      "Socrealizm (narzucony przez władze)",
      "Nowa Fala – pokolenie '68",
      "Postmodernizm i literatura najnowsza",
    ],
    authors: [
      { name: "Tadeusz Borowski", works: ["Proszę państwa do gazu", "U nas, w Auschwitzu..."] },
      { name: "Wisława Szymborska", works: ["Nic dwa razy", "Głos w sprawie pornografii"] },
      { name: "Czesław Miłosz", works: ["Campo di Fiori", "Zniewolony umysł", "Który skrzywdziłeś"] },
      { name: "Zbigniew Herbert", works: ["Pan Cogito", "Przesłanie Pana Cogito"] },
      { name: "Sławomir Mrożek", works: ["Tango"] },
      { name: "Hanna Krall", works: ["Zdążyć przed Panem Bogiem"] },
    ],
    keyThemes: ["Pamięć i trauma", "Wolność i zniewolenie", "Tożsamość", "Absurd i groteska"],
  },
];
