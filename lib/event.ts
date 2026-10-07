export const EVENT = {
  name: "Water Park Restaurant & Party Center",
  title: "Grand Opening Ceremony",
  // 9 October 2026, 4:30 PM Dhaka time (UTC+6)
  start: new Date("2026-10-09T16:30:00+06:00"),
  dateLabel: "9 October 2026",
  dayLabel: "Friday",
  timeLabel: "4:30 PM",
  venue: "Water Park Restaurant & Party Center",
  address: "Holding - 02, Road - 1/B, Block - I, Sector - 17, Uttara, Dhaka - 1230",
  landmark: "Uttara Center Metro Station, East Side of Pillar No - 73",
  website: "https://www.waterparkbd.com",
  websiteLabel: "www.waterparkbd.com",
  email: "waterpark.restaurant@gmail.com",
  phone: "+8801303441155",
  phoneLabel: "01303441155",
};

export const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${EVENT.venue}, Sector 17, Uttara, Dhaka 1230`);
