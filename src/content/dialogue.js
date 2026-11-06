/**
 * Crew chatter: short lines from the cast, shown with their portrait (ui/SpeechBox.js). Picked
 * at random for each moment, so they don't repeat too often. The story can use the same cast and
 * speech box later.
 *
 * Each line: [who, mood, text]. who: a CAST key; mood: 'neutral' | 'happy' | 'worried'.
 */
export const CAST = {
  driver: 'Old Bill, driver',
  fireman: 'Sam, fireman',
  'station-master': 'Mrs Pennywhistle, station mistress',
  'mysterious-client': 'A stranger in a red cloak',
  'rival-boss': 'Sir Reginald Crowe, Crowe & Co. Railways',
};

export const LINES = {
  runStart: [
    ['station-master', 'happy', 'Rouge Central, all aboard! Mind the gap, and mind the coal.'],
    ['station-master', 'neutral', 'Line’s clear to the hills. Don’t come back with an empty tender.'],
    ['driver', 'happy', 'Right then, Sam. Fire her up. Let’s see where the line takes us.'],
  ],
  newArea: [
    ['driver', 'neutral', 'New country. Keep an eye out for coal.'],
    ['fireman', 'happy', 'Never been this far out! Look at it, Bill!'],
    ['driver', 'neutral', 'Through the mountain and out the other side. Steady now.'],
  ],
  overheated: [
    ['driver', 'worried', 'She’s running too hot! Ease off and find some water.'],
    ['fireman', 'worried', 'Gauge is in the red, Bill! I can’t get near the firebox!'],
  ],
  breakdown: [
    ['fireman', 'worried', 'That didn’t sound good. Something’s come loose underneath!'],
    ['driver', 'worried', 'She needs a proper Workshop, not more of my string and hope.'],
  ],
  lowFuel: [
    ['fireman', 'worried', 'Scraping the bottom of the tender here, Bill.'],
    ['driver', 'worried', 'Coal, Sam. We need coal, and soon.'],
  ],
  stranded: [
    ['fireman', 'worried', 'Fire’s out. I’ll go and wave down a relief engine.'],
  ],
  objective: [
    ['driver', 'happy', 'That’s a job well done. The company will be pleased.'],
    ['fireman', 'happy', 'Ha! Told you we could do it!'],
    ['station-master', 'happy', 'Telegram from Central: well done, crew.'],
  ],
  // Occasional visitors at stops.
  rival: [
    ['rival-boss', 'happy', 'Still running that old kettle? Crowe & Co. will have this line yet.'],
    ['rival-boss', 'neutral', 'Lovely engine. Shame about the driver.'],
    ['rival-boss', 'worried', 'You again? How do you keep getting here first?'],
  ],
  stranger: [
    ['mysterious-client', 'neutral', 'You go further than the others. I may have work for you… one day.'],
    ['mysterious-client', 'neutral', 'Some cargo is worth more than gold. Remember that.'],
    ['mysterious-client', 'worried', 'If a man in a tall hat asks about me, you haven’t seen me.'],
  ],
};

/** How often visitors appear at a stop (each is checked separately). */
export const VISITOR_CHANCE = { rival: 0.08, stranger: 0.06 };
