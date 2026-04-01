export const NAV_LINKS = [
    { label: "About", href: "#about" },
    { label: "Timeline", href: "#timeline" },
    { label: "Sponsors", href: "#sponsors" },
    { label: "Gallery", href: "#past-events" },
];

export const HERO_STATS = [
    { icon: "🏁", label: "Competition Day: 20/06/2026" },
    { icon: "🤖", label: "Autonomous Micromouse Robots" },
    { icon: "🎓", label: "University of Moratuwa" },
];

export const ABOUT_FEATURES = [
    { icon: "💡", label: "Innovation in Robotics" },
    { icon: "🧩", label: "Algorithmic Problem-Solving" },
    { icon: "⚙️", label: "Embedded Systems Development" },
    { icon: "🔧", label: "Practical Engineering Skills" },
    { icon: "🤝", label: "Team Collaboration" },
];

export const MICROMOUSE_STATS = [
    { title: "Fully Autonomous", description: "No remote control" },
    { title: "Sensor-Driven", description: "IR or ultrasonic sensors" },
    { title: "Algorithm-Powered", description: "Flood-fill & more" },
];

export const TIMELINE_EVENTS = [
    {
        number: "01",
        title: "Registration Opens",
        date: "04/04/2026",
    },
    {
        number: "02",
        title: "Registration Closes",
        date: "05/05/2026",
    },
    {
        number: "03",
        title: "Competition Day",
        date: "20/06/2026",
    },
];

export const WORKSHOP_EVENTS = [
    {
        number: "01",
        date: "11/04/2026",
        fullDate: "2026-04-11",
        title: "Foundations, Components & Build Start",
        description:
            "Introduction to Micromouse rules, robot anatomy, and electronics basics. Teams begin their physical build.",
    },
    {
        number: "02",
        date: "18/04/2026",
        fullDate: "2026-04-18",
        title: "Microcontrollers, Sensors & Basic Movement",
        description:
            "Microcontroller setup, IR sensor interfacing, and encoder integration. Robot performs its first movements.",
    },
    {
        number: "03",
        date: "25/04/2026",
        fullDate: "2026-04-25",
        title: "PID Control & Wall Following",
        description:
            "PID theory, tuning, and implementation for stable wall-following behaviour.",
    },
    {
        number: "04",
        date: "02/05/2026",
        fullDate: "2026-05-02",
        title: "Maze-Solving Algorithms & Full Integration",
        description:
            "Flood Fill algorithm and full system integration into a competition-ready robot.",
    },
];

export const ORGANIZERS = [
    {
        title: "IEEE Robotics & Automation Society",
        subtitle: "Student Branch Chapter — University of Moratuwa",
        description:
            "Dedicated to advancing robotics and automation through innovation, education, and research. Fostering collaboration through technical events, publications, and research initiatives.",
        tag: "IEEE RAS",
        logo: "/IEEE_RAS.jpg",
        href: "https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/",
    },
    {
        title: "IEEE Women in Engineering",
        subtitle: "Student Branch Affinity Group — University of Moratuwa",
        description:
            "Dedicated to uplifting women engineers by promoting gender diversity in engineering. Connecting over 30,000 members in more than 100 countries.",
        tag: "IEEE WIE",
        logo: "/IEEE-WIE.png",
        href: "https://site.ieee.org/sb-moratuwa/chapters/women-in-engineering/",
    },
];

export interface SponsorTier {
    tier: string;
    amount: string;
    color: string;
    perks: string[];
    icon: string;
}

export const SPONSOR_TIERS: SponsorTier[] = [
    {
        tier: "Title Partner",
        amount: "LKR 150,000",
        color: "#EAF6FF",
        icon: "👑",
        perks: [
            "Exclusive naming rights",
            "Logo on all materials",
            "Opening ceremony speech",
            "Premium booth space",
        ],
    },
    {
        tier: "Gold Partner",
        amount: "LKR 100,000",
        color: "#F4C430",
        icon: "🥇",
        perks: [
            "Logo on banners & website",
            "Social media features",
            "Booth at competition",
            "Certificate of partnership",
        ],
    },
    {
        tier: "Silver Partner",
        amount: "LKR 75,000",
        color: "#A9D6E5",
        icon: "🥈",
        perks: [
            "Logo on website",
            "Social media mentions",
            "Brand visibility at event",
        ],
    },
    {
        tier: "Workshop Partner",
        amount: "LKR 75,000",
        color: "#61A5C2",
        icon: "🔬",
        perks: [
            "Brand in workshop materials",
            "Logo on certificates",
            "Mention in pre-event promotions",
        ],
    },
    {
        tier: "Gift Partner",
        amount: "LKR 50,000",
        color: "#2C7DA0",
        icon: "🎁",
        perks: [
            "Brand on gift items",
            "Logo on website",
            "Social media shoutout",
        ],
    },
    {
        tier: "Banking Partner",
        amount: "LKR 45,000",
        color: "#1B4965",
        icon: "🏦",
        perks: [
            "Logo on financial materials",
            "Mention during event",
            "Website logo placement",
        ],
    },
    {
        tier: "In-Kind",
        amount: "Negotiable",
        color: "#0D2233",
        icon: "🤝",
        perks: [
            "Custom partnership package",
            "Flexible contribution options",
            "Brand acknowledgment",
        ],
    },
];


export const PAST_EVENTS = [
    {
        title: "BotTalk",
        description:
            "A panel discussion where robotics and technology experts discussed industry insights, advancements, and future opportunities with the audience.",
        images: ["/1.jpg", "/1-1.jpg", "/1-2.jpg"],
    },
    {
        title: "Gammaddata IEEE Api",
        description:
            "A school workshop series introducing students to robotics and basic STEM concepts through interactive sessions and demonstrations.",
        images: ["/2.jpg", "/2-1.jpg", "/2-2.jpg"],
    },
    {
        title: "Robotics Day",
        description:
            "An exhibition showcasing University of Moratuwa robotics projects, with keynote sessions from RoboticGen and Zone24 featuring live robot demonstrations.",
        images: ["/3.jpg", "/3-1.jpg", "/3-2.jpeg"],
    },
];

// Countdown target dates
export const REGISTRATION_OPEN_DATE = new Date("2026-04-04T00:00:00+05:30");
export const COMPETITION_DATE = new Date("2026-06-20T00:00:00+05:30");
