export type Lang = "en" | "hi";

const t = {
  // ── Navigation groups ───────────────────────────────────────────────────
  nav: {
    daily:      { en: "Daily",       hi: "दैनिक" },
    restaurant: { en: "Restaurant",  hi: "रेस्तरां" },
    staff:      { en: "Staff",       hi: "स्टाफ" },
    ai:         { en: "AI",          hi: "AI" },

    dashboard:  { en: "Dashboard",   hi: "डैशबोर्ड" },
    orders:     { en: "Orders",      hi: "ऑर्डर" },
    floorPlan:  { en: "Floor Plan",  hi: "फ्लोर प्लान" },
    bills:      { en: "Bills",       hi: "बिल" },
    earnings:   { en: "Earnings",    hi: "कमाई" },
    menu:       { en: "Menu",        hi: "मेनू" },
    tablesQr:   { en: "Tables & QR", hi: "टेबल और QR" },
    customers:  { en: "Customers",   hi: "ग्राहक" },
    delivery:   { en: "Delivery",    hi: "डिलीवरी" },
    kitchen:    { en: "Kitchen KDS", hi: "किचन KDS" },
    captain:    { en: "Captain App", hi: "कैप्टन ऐप" },
    shift:      { en: "Shift",       hi: "शिफ्ट" },
    schedule:   { en: "AI Schedule", hi: "AI शेड्यूल" },
    settings:   { en: "Settings",    hi: "सेटिंग्स" },
    signOut:    { en: "Sign out",    hi: "साइन आउट" },
    home:       { en: "Home",        hi: "होम" },
    floor:      { en: "Floor",       hi: "फ्लोर" },
    more:       { en: "More",        hi: "और" },
  },

  // ── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    title:          { en: "Today's Dashboard",      hi: "आज का डैशबोर्ड" },
    subtitle:       { en: "Live overview of kitchen, tables, and revenue.", hi: "किचन, टेबल और कमाई का लाइव अवलोकन।" },
    activeOrders:   { en: "Active orders",           hi: "सक्रिय ऑर्डर" },
    delayed:        { en: "Delayed",                 hi: "विलंबित" },
    completed:      { en: "Completed",               hi: "पूर्ण" },
    todaysEarnings: { en: "Today's Earnings",        hi: "आज की कमाई" },
    activeOrdersSection: { en: "Active Orders",      hi: "सक्रिय ऑर्डर" },
    viewAll:        { en: "View all →",              hi: "सभी देखें →" },
    noOrders:       { en: "No active orders",        hi: "कोई सक्रिय ऑर्डर नहीं" },
    noOrdersDesc:   { en: "Orders from QR scans and delivery partners will appear here.", hi: "QR स्कैन और डिलीवरी पार्टनर के ऑर्डर यहाँ दिखेंगे।" },
    peakTime:       { en: "Peak time",               hi: "पीक समय" },
    fullSchedule:   { en: "Full schedule & analytics →", hi: "पूरा शेड्यूल और एनालिटिक्स →" },
    cancelOrder:    { en: "Cancel this order?",      hi: "यह ऑर्डर रद्द करें?" },
    markedAs:       { en: "Order marked",            hi: "ऑर्डर मार्क किया गया" },
    cancelled:      { en: "Order cancelled",         hi: "ऑर्डर रद्द किया गया" },
  },

  // ── Orders ──────────────────────────────────────────────────────────────
  orders: {
    title:        { en: "Orders",           hi: "ऑर्डर" },
    all:          { en: "All",              hi: "सभी" },
    active:       { en: "Active",           hi: "सक्रिय" },
    completed:    { en: "Completed",        hi: "पूर्ण" },
    cancelled:    { en: "Cancelled",        hi: "रद्द" },
    noOrders:     { en: "No orders yet",    hi: "अभी कोई ऑर्डर नहीं" },
    table:        { en: "Table",            hi: "टेबल" },
    total:        { en: "Total",            hi: "कुल" },
    items:        { en: "items",            hi: "आइटम" },
    advance:      { en: "Advance",          hi: "आगे बढ़ाएं" },
    cancel:       { en: "Cancel",           hi: "रद्द करें" },
  },

  // ── Common actions ──────────────────────────────────────────────────────
  common: {
    save:         { en: "Save changes",   hi: "बदलाव सहेजें" },
    saving:       { en: "Saving…",        hi: "सहेजा जा रहा है…" },
    cancel:       { en: "Cancel",         hi: "रद्द करें" },
    close:        { en: "Close",          hi: "बंद करें" },
    loading:      { en: "Loading…",       hi: "लोड हो रहा है…" },
    search:       { en: "Search…",        hi: "खोजें…" },
    add:          { en: "Add",            hi: "जोड़ें" },
    edit:         { en: "Edit",           hi: "संपादित करें" },
    delete:       { en: "Delete",         hi: "हटाएं" },
    yes:          { en: "Yes",            hi: "हाँ" },
    no:           { en: "No",             hi: "नहीं" },
    back:         { en: "Back",           hi: "वापस" },
    next:         { en: "Next",           hi: "अगला" },
    done:         { en: "Done",           hi: "हो गया" },
    generate:     { en: "Generate Bill",  hi: "बिल बनाएं" },
    print:        { en: "Print",          hi: "प्रिंट" },
    today:        { en: "Today",          hi: "आज" },
    restaurant:   { en: "Restaurant",     hi: "रेस्तरां" },
    notSetUp:     { en: "Not set up yet", hi: "अभी सेट नहीं" },
  },

  // ── Status labels ───────────────────────────────────────────────────────
  status: {
    pending:    { en: "Pending",    hi: "प्रतीक्षारत" },
    preparing:  { en: "Preparing",  hi: "बन रहा है" },
    ready:      { en: "Ready",      hi: "तैयार" },
    served:     { en: "Served",     hi: "परोसा गया" },
    completed:  { en: "Completed",  hi: "पूर्ण" },
    cancelled:  { en: "Cancelled",  hi: "रद्द" },
    delayed:    { en: "Delayed",    hi: "विलंबित" },
    available:  { en: "Available",  hi: "उपलब्ध" },
    occupied:   { en: "Occupied",   hi: "व्यस्त" },
  },

  // ── Earnings ────────────────────────────────────────────────────────────
  earnings: {
    title:        { en: "Earnings",           hi: "कमाई" },
    subtitle:     { en: "Revenue & billing",  hi: "राजस्व और बिलिंग" },
    totalRevenue: { en: "Total Revenue",      hi: "कुल राजस्व" },
    totalOrders:  { en: "Total Orders",       hi: "कुल ऑर्डर" },
    avgOrder:     { en: "Avg Order",          hi: "औसत ऑर्डर" },
    noBill:       { en: "No bill",            hi: "बिल नहीं" },
    billed:       { en: "Billed",             hi: "बिल किया गया" },
    cash:         { en: "Cash",               hi: "नकद" },
    upi:          { en: "UPI",                hi: "UPI" },
    card:         { en: "Card",               hi: "कार्ड" },
    noEarnings:   { en: "No completed orders on this day", hi: "इस दिन कोई पूर्ण ऑर्डर नहीं" },
  },

  // ── Settings ────────────────────────────────────────────────────────────
  settings: {
    title:          { en: "Settings",             hi: "सेटिंग्स" },
    subtitle:       { en: "Restaurant profile and bill defaults.", hi: "रेस्तरां प्रोफाइल और बिल डिफ़ॉल्ट।" },
    restaurantName: { en: "Name",                 hi: "नाम" },
    address:        { en: "Address",              hi: "पता" },
    phone:          { en: "Phone",                hi: "फोन" },
    gstin:          { en: "GSTIN",                hi: "GSTIN" },
    tax:            { en: "Tax %",                hi: "कर %" },
    invoicePrefix:  { en: "Invoice prefix",       hi: "इनवॉइस उपसर्ग" },
    profile:        { en: "Restaurant profile",   hi: "रेस्तरां प्रोफाइल" },
    setup:          { en: "Set up your restaurant", hi: "अपना रेस्तरां सेट करें" },
  },

  // ── Onboarding ──────────────────────────────────────────────────────────
  onboarding: {
    welcome:      { en: "Welcome! Let's set up your restaurant 🍽️", hi: "स्वागत है! अपना रेस्तरां सेट करें 🍽️" },
    subtitle:     { en: "This takes under 2 minutes. You can edit everything later.", hi: "इसमें 2 मिनट से कम लगता है। आप बाद में सब कुछ बदल सकते हैं।" },
    continue:     { en: "Continue",           hi: "जारी रखें" },
    tablesTitle:  { en: "How many tables do you have?", hi: "आपके पास कितनी टेबल हैं?" },
    allSet:       { en: "You're all set! 🎉", hi: "सब तैयार है! 🎉" },
    goToDashboard:{ en: "Go to Dashboard →",  hi: "डैशबोर्ड पर जाएं →" },
  },

  // ── Theme / Lang toggle labels ──────────────────────────────────────────
  ui: {
    dark:   { en: "Dark",    hi: "डार्क" },
    light:  { en: "Light",   hi: "लाइट" },
    hindi:  { en: "हिंदी",   hi: "हिंदी" },
    english:{ en: "English", hi: "English" },
  },
} as const;

type TranslationNode = { en: string; hi: string };

/** Extracts a translation string from a leaf node */
export function tr(obj: TranslationNode, lang: Lang): string {
  return obj[lang];
}

export default t;
