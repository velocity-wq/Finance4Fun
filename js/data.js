// ============================================
// FINANCE4FUN — Terms Database
// ============================================
// Each term has: id, term, definition, example, category, level
//
// Categories: pe, ib, vc, pc, investing, economics, personal-finance
// Levels: beginner, intermediate, advanced
//
// To add more terms, just follow the same format below!
// ============================================

const FINANCE_TERMS = [
  // ── BEGINNER ──────────────────────────────────────
  {
    id: 1,
    term: "Stock",
    definition: "A stock represents a share of ownership in a publicly traded company. When you buy a stock, you become a partial owner (shareholder) of that company and may benefit from its growth through price appreciation or dividends.",
    example: "If you buy 10 shares of Apple stock, you own a tiny fraction of Apple Inc. and can profit if the share price rises.",
    category: "investing",
    level: "beginner"
  },
  {
    id: 2,
    term: "Bond",
    definition: "A bond is a fixed-income debt instrument where an investor lends money to an entity (corporate or governmental) that borrows the funds for a defined period at a fixed or variable interest rate.",
    example: "A U.S. Treasury Bond pays you interest every six months and returns your principal when it matures in 10, 20, or 30 years.",
    category: "investing",
    level: "beginner"
  },
  {
    id: 3,
    term: "Compound Interest",
    definition: "Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. It causes wealth to grow exponentially over time rather than linearly.",
    example: "If you invest $1,000 at 8% annual compound interest, after 10 years you'd have about $2,159 — not just $1,800 as with simple interest.",
    category: "personal-finance",
    level: "beginner"
  },
  {
    id: 4,
    term: "Inflation",
    definition: "Inflation is the rate at which the general level of prices for goods and services rises over time, eroding purchasing power. Central banks attempt to manage inflation to maintain economic stability.",
    example: "If inflation is 3% per year, a coffee that costs $5 today would cost about $5.15 next year.",
    category: "economics",
    level: "beginner"
  },
  {
    id: 5,
    term: "Credit Score",
    definition: "A credit score is a numerical expression (typically 300–850) that represents a person's creditworthiness, based on their credit history, payment behavior, debt levels, and other financial factors.",
    example: "A credit score of 750+ is considered excellent and can help you qualify for the lowest mortgage interest rates.",
    category: "personal-finance",
    level: "beginner"
  },
  {
    id: 6,
    term: "GDP (Gross Domestic Product)",
    definition: "GDP measures the total monetary value of all finished goods and services produced within a country's borders in a specific time period. It serves as a comprehensive scorecard of a country's economic health.",
    example: "The United States has the world's largest GDP at over $25 trillion, reflecting the total output of its economy.",
    category: "economics",
    level: "beginner"
  },
  {
    id: 7,
    term: "Portfolio",
    definition: "A portfolio is a collection of financial investments such as stocks, bonds, cash, and other assets held by an individual or institution. Diversifying a portfolio helps manage risk.",
    example: "A balanced portfolio might include 60% stocks, 30% bonds, and 10% cash to balance growth potential with stability.",
    category: "investing",
    level: "beginner"
  },

  // ── INTERMEDIATE ──────────────────────────────────
  {
    id: 8,
    term: "Leveraged Buyout (LBO)",
    definition: "A leveraged buyout is an acquisition of a company using a significant amount of borrowed money (debt) to meet the cost of the purchase. The assets of the company being acquired are often used as collateral for the loans.",
    example: "A PE firm acquires a $500M company using $100M of its own equity and $400M in debt, planning to pay off the debt using the company's cash flows.",
    category: "pe",
    level: "intermediate"
  },
  {
    id: 9,
    term: "IPO (Initial Public Offering)",
    definition: "An IPO is the process through which a private company offers its shares to the public for the first time on a stock exchange. Investment banks typically underwrite and facilitate the offering.",
    example: "When Facebook went public in 2012, its IPO raised $16 billion, making it one of the largest tech IPOs in history.",
    category: "ib",
    level: "intermediate"
  },
  {
    id: 10,
    term: "Term Sheet",
    definition: "A term sheet is a non-binding agreement outlining the basic terms and conditions of an investment. It serves as a template for developing more detailed legal documents in a venture capital deal.",
    example: "A VC firm sends a term sheet offering to invest $5M at a $20M pre-money valuation for a 20% ownership stake in the startup.",
    category: "vc",
    level: "intermediate"
  },
  {
    id: 11,
    term: "Mezzanine Debt",
    definition: "Mezzanine debt is a hybrid form of financing that sits between senior debt and equity in a company's capital structure. It typically carries higher interest rates due to its subordinated position and may include equity conversion features.",
    example: "A company raises $30M in mezzanine financing at 12% interest with warrants, to fund an acquisition without giving up too much equity.",
    category: "pc",
    level: "intermediate"
  },
  {
    id: 12,
    term: "P/E Ratio (Price-to-Earnings)",
    definition: "The P/E ratio compares a company's current share price to its earnings per share (EPS). A high P/E may indicate that a stock is overvalued or that investors expect high future growth rates.",
    example: "A company trading at $100 per share with $5 in EPS has a P/E ratio of 20, meaning investors pay $20 for every $1 of earnings.",
    category: "investing",
    level: "intermediate"
  },
  {
    id: 13,
    term: "Yield Curve",
    definition: "The yield curve is a graph plotting the interest rates of bonds with equal credit quality but different maturity dates. An inverted yield curve (short-term rates exceeding long-term rates) is often seen as a predictor of recession.",
    example: "When 2-year Treasury yields exceed 10-year Treasury yields, the yield curve inverts, historically preceding recessions by 12–18 months.",
    category: "economics",
    level: "intermediate"
  },

  // ── ADVANCED ──────────────────────────────────────
  {
    id: 14,
    term: "Carried Interest",
    definition: "Carried interest (or 'carry') is the share of profits (typically 20%) that fund managers in private equity and hedge funds receive as performance-based compensation, usually after returning the invested capital and a preferred return to limited partners.",
    example: "A PE fund generates $500M in profits. After returning capital and the 8% hurdle rate, the general partners earn 20% of remaining profits as carry.",
    category: "pe",
    level: "advanced"
  },
  {
    id: 15,
    term: "Discounted Cash Flow (DCF)",
    definition: "DCF is a valuation method that estimates the present value of an investment based on its expected future cash flows, discounted back at a rate that reflects the riskiness of those cash flows (typically the weighted average cost of capital).",
    example: "An investment banker values a company by projecting its free cash flows for 10 years, then applying a 10% discount rate to determine a present value of $2.1 billion.",
    category: "ib",
    level: "advanced"
  },
  {
    id: 16,
    term: "Cap Table (Capitalization Table)",
    definition: "A cap table is a detailed spreadsheet or table showing the equity ownership structure of a company, including all shares, options, warrants, and convertible notes, along with each stakeholder's percentage ownership and dilution across funding rounds.",
    example: "After a Series B round, the cap table shows founders holding 40%, Series A investors at 25%, Series B investors at 20%, and the employee option pool at 15%.",
    category: "vc",
    level: "advanced"
  },
  {
    id: 17,
    term: "Covenant-Lite Loans",
    definition: "Covenant-lite (cov-lite) loans are debt agreements that lack the traditional protective covenants (such as maintenance-based financial tests) that lenders typically require. They give borrowers more operational flexibility but offer less protection to creditors.",
    example: "In a hot credit market, a leveraged borrower secures a cov-lite loan with no maintenance covenants, only incurrence-based tests triggered by specific actions.",
    category: "pc",
    level: "advanced"
  },
  {
    id: 18,
    term: "Alpha",
    definition: "Alpha measures the excess return of an investment relative to a benchmark index. Positive alpha indicates the investment outperformed the market on a risk-adjusted basis, while negative alpha indicates underperformance.",
    example: "A hedge fund manager who returns 15% when the S&P 500 returns 10% has generated 5% alpha, meaning they added value beyond what the market delivered.",
    category: "investing",
    level: "advanced"
  },
  {
    id: 19,
    term: "Quantitative Easing (QE)",
    definition: "Quantitative easing is an unconventional monetary policy in which a central bank purchases government securities or other financial assets from the market to increase the money supply, lower interest rates, and stimulate economic activity when conventional tools are exhausted.",
    example: "During the 2008 financial crisis, the Federal Reserve launched multiple rounds of QE, purchasing trillions in bonds to inject liquidity into the banking system.",
    category: "economics",
    level: "advanced"
  },
  {
    id: 20,
    term: "Dollar-Cost Averaging (DCA)",
    definition: "Dollar-cost averaging is an investment strategy where an investor divides the total amount to be invested across periodic purchases of a target asset, reducing the impact of volatility on the overall purchase price.",
    example: "Instead of investing $12,000 at once, you invest $1,000 per month for a year, buying more shares when prices are low and fewer when prices are high.",
    category: "investing",
    level: "intermediate"
  }
];

// Category display names and icons
const CATEGORIES = {
  'pe': { name: 'Private Equity', emoji: '🏛️' },
  'ib': { name: 'Investment Banking', emoji: '🏦' },
  'vc': { name: 'Venture Capital', emoji: '🚀' },
  'pc': { name: 'Private Credit', emoji: '💳' },
  'investing': { name: 'Investing', emoji: '📈' },
  'economics': { name: 'Economics', emoji: '🌍' },
  'personal-finance': { name: 'Personal Finance', emoji: '💰' }
};

// Level display names
const LEVELS = {
  'beginner': { name: 'Beginner', emoji: '🌱' },
  'intermediate': { name: 'Intermediate', emoji: '📘' },
  'advanced': { name: 'Advanced', emoji: '🎓' }
};
