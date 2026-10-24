// Starting data for the fake API. It is shaped like the responses in FRONTEND-DATA-NEEDS.md.
// Dates are relative to "now", so the demo always looks recent.
import { slugify } from '../lib/format.js';

const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days) => new Date(Date.now() + days * DAY).toISOString();

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** A colourful stand-in image so portfolios look real without any uploaded files. */
export function placeholderPhoto(seed) {
  const palettes = [
    ['#0F2E25', '#087A4A'],
    ['#FFC21A', '#E5702A'],
    ['#2F5D8A', '#8EC1EA'],
    ['#7A3E65', '#E8A1CC'],
    ['#087A4A', '#A5E3C4'],
    ['#B93226', '#F2A79F'],
  ];
  const [a, b] = palettes[hash(seed) % palettes.length];
  const cx = 80 + (hash(seed + 'x') % 240);
  const cy = 60 + (hash(seed + 'y') % 160);
  const r = 50 + (hash(seed + 'r') % 60);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
    `<rect width='400' height='300' fill='url(#g)'/>` +
    `<circle cx='${cx}' cy='${cy}' r='${r}' fill='white' fill-opacity='.2'/>` +
    `<path d='M0 300 L120 190 L210 260 L300 170 L400 270 V300 Z' fill='black' fill-opacity='.2'/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Each review: [client display name, job, rating, comment, days ago]
const PEOPLE = [
  {
    name: 'Wanjiku Mwangi',
    phone: '+254712345678',
    password: 'wanjiku2026',
    headline: 'Wedding and event photographer',
    bio: 'Seven years of shooting weddings, graduations and corporate events around Nairobi and Kiambu. I deliver edited photos within a week and bring my own lighting.',
    county: 'Nairobi',
    town: 'Kasarani',
    skills: ['Photography', 'Video editing', 'Photo retouching'],
    showWhatsapp: true,
    memberDays: 210,
    portfolio: [
      { title: 'Kamau wedding, Karen', description: 'Full-day coverage with 600 edited photos.', link: null },
      { title: 'Strathmore graduation', description: 'Group and portrait shots for 120 graduands.', link: null },
      { title: 'Safaricom staff retreat', description: 'Two days of event coverage in Naivasha.', link: 'https://instagram.com' },
    ],
    reviews: [
      ['Lucy A.', 'Birthday party photos', 5, 'She arrived early and the photos were ready in four days. Everyone loved them.', 12],
      ['Daniel O.', 'Graduation shoot', 5, 'Patient with a large group and very professional.', 38],
      ['Janet W.', 'Wedding photography', 4, 'Beautiful pictures. Delivery took a little longer than promised but she kept us updated.', 70],
      ['Samuel N.', 'Corporate event coverage', 5, 'Captured exactly what our team needed for the annual report.', 120],
    ],
  },
  {
    name: 'Brian Otieno',
    phone: '+254722100102',
    password: 'brian-fixit-1',
    headline: 'Phone and laptop repair',
    bio: 'Screen replacements, battery changes and software fixes for Samsung, Tecno, Infinix, iPhone and most laptops. I give a price before I start.',
    county: 'Kisumu',
    town: 'Milimani',
    skills: ['Phone repair', 'Laptop repair', 'Screen replacement'],
    showWhatsapp: true,
    memberDays: 300,
    portfolio: [
      { title: 'Cracked iPhone 11 screen', description: 'Replaced in 45 minutes while the owner waited.', link: null },
      { title: 'Laptop that would not boot', description: 'Reinstalled Windows and recovered the photos.', link: null },
    ],
    reviews: [
      ['Faith A.', 'Tecno screen replacement', 5, 'Fixed it the same afternoon and the price was fair.', 6],
      ['Moses K.', 'Laptop not charging', 5, 'Honest. Told me it was the charger, not the whole laptop.', 21],
      ['Rose M.', 'Samsung battery change', 4, 'Good work. Shop is a bit hard to find.', 44],
      ['Victor L.', 'Laptop keyboard replacement', 5, 'Very quick, works perfectly.', 80],
      ['Ann N.', 'Phone water damage', 4, 'Could not save everything but recovered my photos.', 130],
      ['Tom O.', 'Screen replacement', 5, 'Recommended him to my brother already.', 160],
    ],
  },
  {
    name: 'Faith Chebet',
    phone: '+254733100103',
    password: 'faith-design-2',
    headline: 'Graphic designer for small businesses',
    bio: 'Logos, posters and social media graphics for shops, salons and farms. I work in English and Kalenjin and explain everything in plain language.',
    county: 'Uasin Gishu',
    town: 'Kapsoya',
    skills: ['Graphic design', 'Logo design', 'Branding', 'Social media graphics'],
    showWhatsapp: true,
    memberDays: 150,
    portfolio: [
      { title: 'Logo for Chepkoilel Dairy', description: 'Logo, packaging labels and a poster.', link: null },
      { title: 'Salon price list poster', description: 'A3 poster printed in full colour.', link: null },
    ],
    reviews: [
      ['Wilson K.', 'Dairy logo and labels', 5, 'She understood what I wanted from the first call.', 15],
      ['Naomi J.', 'Salon poster', 5, 'Done in two days and it looks great on the wall.', 40],
      ['Peter R.', 'Social media pack', 4, 'Good designs. I needed one round of changes.', 90],
    ],
  },
  {
    name: 'Hassan Abdalla',
    phone: '+254711100104',
    password: 'hassan-volt-3',
    headline: 'Electrician and solar installer',
    bio: 'Licensed electrician. House wiring, fault finding, solar panels and CCTV. I carry a certificate and give a written quote.',
    county: 'Mombasa',
    town: 'Nyali',
    skills: ['Electrical wiring', 'Solar installation', 'CCTV installation'],
    showWhatsapp: true,
    memberDays: 400,
    portfolio: [
      { title: 'Three-bedroom house rewiring', description: 'Full rewiring with a new distribution board.', link: null },
      { title: 'Solar for a guest house', description: '3 kW system with batteries.', link: null },
    ],
    reviews: [
      ['Mariam S.', 'House rewiring', 5, 'Clean work, tidy finish and he explained every step.', 9],
      ['Omar H.', 'CCTV installation', 5, 'Four cameras working on my phone the same day.', 30],
      ['Juma B.', 'Fault finding', 4, 'Found the problem quickly after two other fundis failed.', 66],
      ['Zainab A.', 'Solar installation', 5, 'Our power bill dropped noticeably.', 110],
      ['Said M.', 'Socket repair', 5, 'On time and fairly priced.', 150],
    ],
  },
  {
    name: 'Mercy Akinyi',
    phone: '+254722100105',
    password: 'mercy-flowers-4',
    headline: 'Event decorator and florist',
    bio: 'Weddings, baby showers and church events in Nakuru. Fresh and artificial flowers, balloon arches and table settings.',
    county: 'Nakuru',
    town: 'Milimani',
    skills: ['Event decoration', 'Floral arrangement'],
    showWhatsapp: false,
    memberDays: 90,
    portfolio: [{ title: 'Garden wedding setup', description: 'Arch, aisle flowers and 20 tables.', link: null }],
    reviews: [
      ['Esther M.', 'Baby shower decoration', 5, 'The venue looked amazing and everything was ready before guests came.', 20],
      ['Caleb T.', 'Wedding flowers', 4, 'Lovely arrangements.', 55],
    ],
  },
  {
    name: 'Kevin Mutua',
    phone: '+254733100106',
    password: 'kevin-code-5',
    headline: 'Web developer for small businesses',
    bio: 'Simple, fast websites that load well on mobile data. WordPress and custom builds. I also help with Google Business listings.',
    county: 'Nairobi',
    town: 'Kilimani',
    skills: ['Web development', 'WordPress', 'SEO'],
    showWhatsapp: true,
    memberDays: 260,
    portfolio: [
      { title: 'Website for a Thika bakery', description: 'Menu, orders by WhatsApp and a map.', link: 'https://example.com' },
      { title: 'Online shop for a boutique', description: 'M-Pesa checkout with WordPress.', link: null },
    ],
    reviews: [
      ['Irene C.', 'Bakery website', 5, 'Our orders went up after the site was live.', 18],
      ['George M.', 'WordPress shop', 5, 'Explained how to update products myself.', 52],
      ['Lilian K.', 'Google Business listing', 4, 'Quick and helpful.', 100],
      ['Patrick N.', 'Portfolio site', 5, 'Delivered a week early.', 140],
    ],
  },
  {
    name: 'Grace Njeri',
    phone: '+254711100107',
    password: 'grace-clean-6',
    headline: 'Home cleaning and laundry',
    bio: 'Deep cleaning for homes and small offices in Thika and Juja. I bring my own supplies and a helper for bigger jobs.',
    county: 'Kiambu',
    town: 'Thika',
    skills: ['House cleaning', 'Laundry', 'Deep cleaning'],
    showWhatsapp: true,
    memberDays: 330,
    portfolio: [{ title: 'Post-construction cleaning', description: 'Two-bedroom apartment, cleaned in one day.', link: null }],
    reviews: [
      ['Beatrice W.', 'Deep cleaning', 5, 'Spotless. She even cleaned the oven.', 4],
      ['John K.', 'Office cleaning', 5, 'Reliable every Saturday for three months.', 25],
      ['Pauline N.', 'Move-out cleaning', 5, 'My landlord returned my deposit in full.', 48],
      ['Alice M.', 'Laundry service', 4, 'Clothes came back clean and folded.', 75],
      ['Dorcas G.', 'House cleaning', 5, 'Trustworthy and hardworking.', 105],
      ['Martin O.', 'Window cleaning', 4, 'Good job overall.', 140],
      ['Susan W.', 'Deep cleaning', 5, 'Will book again.', 200],
    ],
  },
  {
    name: 'Samuel Kiprono',
    phone: '+254722100108',
    password: 'samuel-pipes-7',
    headline: 'Plumber',
    bio: 'Leaking pipes, blocked drains, tank installation and bathroom fittings. Available evenings and weekends.',
    county: 'Nairobi',
    town: 'Embakasi',
    skills: ['Plumbing', 'Pipe repair', 'Water tank installation'],
    showWhatsapp: true,
    memberDays: 180,
    portfolio: [{ title: '5,000 litre tank installation', description: 'Tank stand, piping and float valve.', link: null }],
    reviews: [
      ['Chris O.', 'Blocked drain', 5, 'Came within the hour and fixed it.', 10],
      ['Eunice M.', 'Tank installation', 5, 'Neat work and he cleaned up afterwards.', 62],
      ['David W.', 'Leaking pipe', 4, 'Fixed the leak. Charged slightly more than quoted but explained why.', 95],
    ],
  },
  {
    name: 'Amina Hussein',
    phone: '+254733100109',
    password: 'amina-stitch-8',
    headline: 'Tailor and fashion designer',
    bio: 'Dresses, suits, school uniforms and alterations. I work from my shop in Eastleigh and also take orders on WhatsApp.',
    county: 'Nairobi',
    town: 'Eastleigh',
    skills: ['Tailoring', 'Fashion design', 'Alterations'],
    showWhatsapp: true,
    memberDays: 240,
    portfolio: [
      { title: 'Bridesmaid dresses', description: 'Six matching dresses in two weeks.', link: null },
      { title: 'School uniform order', description: '40 uniforms for a nursery school.', link: null },
    ],
    reviews: [
      ['Halima A.', 'Bridesmaid dresses', 5, 'Perfect fit for all six of us.', 14],
      ['Joyce M.', 'Suit alterations', 5, 'Fixed my suit overnight.', 35],
      ['Fatuma D.', 'Kitenge dress', 5, 'Better than the picture I showed her.', 80],
      ['Ibrahim N.', 'School uniforms', 4, 'Good quality and delivered on time.', 120],
      ['Rehema S.', 'Wedding dress hem', 5, 'Careful and honest about the price.', 170],
    ],
  },
  {
    name: 'Dennis Wafula',
    phone: '+254711100110',
    password: 'dennis-drone-9',
    headline: 'Videographer and drone operator',
    bio: 'Event videos, property tours and drone footage in Kakamega and Bungoma. Edited videos delivered on a flash disk or by link.',
    county: 'Kakamega',
    town: 'Milimani',
    skills: ['Videography', 'Drone footage', 'Video editing'],
    showWhatsapp: true,
    memberDays: 120,
    portfolio: [{ title: 'Farm property tour', description: 'Drone flyover and walk-through video.', link: null }],
    reviews: [
      ['Agnes N.', 'Property video', 5, 'Our land sold within two weeks of posting the video.', 28],
      ['Brian S.', 'Wedding video', 4, 'Good footage. The edit took longer than planned.', 85],
    ],
  },
];

export function buildSeed() {
  const db = { users: [], profiles: [], requests: [], reviews: [], seq: 1000 };
  const nextId = (prefix) => `${prefix}_${db.seq++}`;

  PEOPLE.forEach((p) => {
    const userId = nextId('u');
    const profileId = nextId('pr');
    db.users.push({ id: userId, fullName: p.name, phone: p.phone, password: p.password });
    db.profiles.push({
      id: profileId,
      userId,
      slug: `${slugify(p.name)}-${hash(p.name).toString(36).slice(0, 3)}`,
      headline: p.headline,
      bio: p.bio,
      county: p.county,
      town: p.town,
      skills: p.skills,
      portfolio: p.portfolio.map((item, i) => ({
        id: nextId('p'),
        title: item.title,
        description: item.description,
        photoUrl: placeholderPhoto(p.name + item.title + i),
        link: item.link,
      })),
      showWhatsapp: p.showWhatsapp,
      createdAt: ago(p.memberDays),
    });
    p.reviews.forEach(([clientDisplayName, jobTitle, rating, comment, days]) => {
      const requestId = nextId('rq');
      db.requests.push({
        id: requestId,
        freelancerUserId: userId,
        clientName: clientDisplayName,
        clientPhone: '+25470' + String(hash(clientDisplayName + p.name) % 10000000).padStart(7, '0'),
        jobTitle,
        status: 'completed',
        sentAt: ago(days + 2),
        expiresAt: ago(days - 5),
        completedAt: ago(days),
        token: `seed-${requestId}`,
      });
      db.reviews.push({
        id: nextId('rv'),
        profileId,
        requestId,
        rating,
        comment,
        jobTitle,
        clientDisplayName,
        verifiedAt: ago(days),
      });
    });
  });

  // Extra requests for the demo account (Wanjiku), so the dashboard shows every status.
  const wanjiku = db.users[0];
  const extra = [
    { id: 'rq_demo1', clientName: 'Peter Kamau', clientPhone: '+254722000111', jobTitle: 'Wedding photography', status: 'pending', sent: 2, expires: 5, token: 'demo-valid' },
    { id: 'rq_demo3', clientName: 'Joseph Maina', clientPhone: '+254733000222', jobTitle: 'Family portraits', status: 'expired', sent: 12, expires: -5, token: 'demo-expired' },
    { id: 'rq_demo4', clientName: 'Esther Wambui', clientPhone: '+254711000333', jobTitle: 'Product photos', status: 'delivery_failed', sent: 1, expires: 6, token: 'demo-undelivered' },
  ];
  extra.forEach((r) =>
    db.requests.push({
      id: r.id,
      freelancerUserId: wanjiku.id,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      jobTitle: r.jobTitle,
      status: r.status,
      sentAt: ago(r.sent),
      expiresAt: ahead(r.expires),
      completedAt: null,
      token: r.token,
    }),
  );
  // A link that has already been used (belongs to Wanjiku's oldest completed review).
  const used = db.requests.find((r) => r.freelancerUserId === wanjiku.id && r.status === 'completed');
  if (used) used.token = 'demo-used';

  return db;
}
