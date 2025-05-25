class LieGenerator {
  constructor() {
    this.lieTemplates = [
      // Personal achievements
      "I once won a local competition for {skill}",
      "I hold the record for {achievement} in my hometown",
      "I was featured in a newspaper for {accomplishment}",
      "I received an award for {talent} when I was younger",
      
      // Unusual experiences
      "I once got trapped in {location} for {duration}",
      "I accidentally {action} at {event}",
      "I once met {person} at {place}",
      "I survived {situation} during {timeframe}",
      
      // Hidden talents
      "I can {skill} while {activity}",
      "I taught myself to {ability} in just {timeframe}",
      "I'm secretly really good at {talent}",
      "I once performed {performance} in front of {audience}",
      
      // Funny mishaps
      "I accidentally became {role} for {duration}",
      "I once confused {thing1} for {thing2} and {consequence}",
      "I got lost in {place} and ended up {outcome}",
      "I mistakenly {action} and it led to {result}",
      
      // Unique jobs/roles
      "I worked as a {job} for {duration}",
      "I was once hired to {task} for {client}",
      "I volunteered as a {role} and {experience}",
      "I briefly worked in {industry} doing {task}",
      
      // Food/cooking
      "I once cooked {dish} for {number} people",
      "I accidentally created a new recipe for {food}",
      "I won a cooking contest with my {dish}",
      "I can make {food} from memory without a recipe",
      
      // Travel/adventure
      "I once traveled to {place} and {experience}",
      "I got stranded in {location} and had to {solution}",
      "I discovered {discovery} while visiting {place}",
      "I accidentally joined {event} while traveling in {location}",
      
      // Animals/pets
      "I once rescued a {animal} from {situation}",
      "I taught my pet {animal} to {trick}",
      "I was chased by a {animal} while {activity}",
      "I found a {animal} in my {location} and {outcome}",
      
      // Technology/gadgets
      "I accidentally {action} my {device} and {result}",
      "I built a {gadget} that can {function}",
      "I once fixed {device} using only {materials}",
      "I discovered a hidden feature in {technology}",
      
      // School/education
      "I once gave a presentation about {topic} to {audience}",
      "I was the only student who {achievement} in {subject}",
      "I accidentally {action} during {school_event}",
      "I taught {subject} to {students} for {duration}"
    ];

    this.replacements = {
      skill: [
        "solving Rubik's cubes blindfolded", "speed reading", "juggling", "whistling loudly",
        "identifying dog breeds", "memorizing phone numbers", "folding origami", "beatboxing",
        "doing magic tricks", "speed typing", "identifying birds by sound", "mental math"
      ],
      achievement: [
        "most pizza slices eaten in one sitting", "longest continuous yodel", "fastest shoe tying",
        "most accurate weather predictions", "best costume at a costume party", "cleanest handwriting",
        "most creative sandwich making", "fastest puzzle solving", "best animal impressions"
      ],
      accomplishment: [
        "organizing a neighborhood cleanup", "starting a book club", "teaching elderly people technology",
        "creating a community garden", "organizing a charity drive", "tutoring struggling students"
      ],
      talent: [
        "creative writing", "photography", "singing", "dancing", "drawing", "storytelling",
        "public speaking", "organizing events", "making people laugh", "remembering names"
      ],
      location: [
        "an elevator", "a library after hours", "a department store", "a parking garage",
        "a museum", "a subway station", "an airport", "a shopping mall", "a hotel lobby"
      ],
      duration: [
        "3 hours", "an entire afternoon", "overnight", "half a day", "several hours",
        "the whole evening", "most of the day", "6 hours straight"
      ],
      action: [
        "started a flash mob", "joined the wrong tour group", "ordered food in the wrong language",
        "wore my shirt inside out", "sat in the wrong meeting", "got on the wrong bus",
        "walked into the wrong building", "answered someone else's phone"
      ],
      event: [
        "a wedding", "a business conference", "a graduation ceremony", "a job interview",
        "a first date", "a family reunion", "a school play", "a sports game"
      ],
      person: [
        "a minor celebrity", "a local news anchor", "a professional athlete", "a famous chef",
        "a bestselling author", "a TV show host", "a social media influencer", "a politician"
      ],
      place: [
        "a coffee shop", "an airport", "a bookstore", "a grocery store", "a park",
        "a restaurant", "a gym", "a library", "a train station", "a hotel"
      ],
      situation: [
        "a sudden thunderstorm", "getting locked out", "a power outage", "a traffic jam",
        "a cancelled flight", "a broken elevator", "a computer crash", "a fire drill"
      ],
      timeframe: [
        "last summer", "during college", "as a teenager", "a few years ago",
        "when I was younger", "during high school", "in my twenties"
      ],
      ability: [
        "play the ukulele", "speak basic sign language", "identify constellations",
        "make balloon animals", "solve crossword puzzles quickly", "remember faces",
        "estimate distances accurately", "identify plants"
      ],
      performance: [
        "karaoke", "stand-up comedy", "a magic show", "a dance routine",
        "a poetry reading", "a cooking demonstration", "a presentation"
      ],
      audience: [
        "100+ people", "my entire school", "a packed auditorium", "a live TV audience",
        "a room full of strangers", "my whole family", "a professional conference"
      ],
      role: [
        "the mascot", "a tour guide", "a translator", "a spokesperson",
        "the organizer", "a judge", "a mentor", "a team captain"
      ],
      thing1: [
        "salt", "my keys", "my phone", "the remote", "my wallet", "my glasses"
      ],
      thing2: [
        "sugar", "someone else's keys", "someone else's phone", "a calculator",
        "someone else's wallet", "a magnifying glass"
      ],
      consequence: [
        "hilarity ensued", "caused a minor disaster", "learned a valuable lesson",
        "made everyone laugh", "created an awkward situation", "started a funny story"
      ],
      outcome: [
        "finding the best restaurant in town", "meeting my future best friend",
        "discovering a hidden talent", "learning something new about myself",
        "having the adventure of a lifetime", "creating a funny memory"
      ],
      result: [
        "it became a family legend", "everyone still talks about it",
        "I learned to always double-check", "it taught me a valuable lesson",
        "it became my claim to fame", "I never lived it down"
      ],
      job: [
        "professional food taster", "mystery shopper", "costume character",
        "survey taker", "pet sitter", "house sitter", "event photographer"
      ],
      task: [
        "organize their closet", "teach their dog tricks", "plan their vacation",
        "design their garden", "organize their photos", "plan their wedding"
      ],
      client: [
        "a busy executive", "a celebrity", "a local business", "my neighbor",
        "a family friend", "a small company", "a nonprofit organization"
      ],
      experience: [
        "learned so much about people", "discovered my passion for helping others",
        "made lifelong friends", "gained valuable experience", "had the time of my life"
      ],
      industry: [
        "food service", "retail", "entertainment", "education", "healthcare",
        "technology", "hospitality", "customer service", "event planning"
      ],
      dish: [
        "lasagna", "birthday cake", "thanksgiving dinner", "wedding cake",
        "pizza", "barbecue", "soup", "pasta", "stir-fry", "dessert"
      ],
      food: [
        "chocolate chip cookies", "pancakes", "bread", "pizza dough",
        "ice cream", "soup", "pasta sauce", "salad dressing"
      ],
      number: [
        "50", "100", "200", "over 100", "nearly 200", "about 150", "close to 300"
      ],
      discovery: [
        "a hidden café", "a beautiful viewpoint", "a local tradition",
        "an amazing street performer", "a historic landmark", "a secret garden"
      ],
      solution: [
        "hitchhike", "walk for miles", "sleep in the airport", "call for help",
        "find a local who helped me", "use my survival skills"
      ],
      animal: [
        "cat", "dog", "bird", "squirrel", "rabbit", "turtle", "hamster", "fish"
      ],
      trick: [
        "shake hands", "play dead", "roll over", "fetch specific items",
        "recognize different people", "respond to hand signals"
      ],
      activity: [
        "hiking", "jogging", "walking my dog", "riding my bike",
        "taking photos", "having a picnic", "reading in the park"
      ],
      device: [
        "computer", "phone", "tablet", "camera", "TV", "microwave", "car"
      ],
      gadget: [
        "phone holder", "desk organizer", "plant watering system",
        "cable organizer", "book stand", "kitchen timer"
      ],
      function: [
        "remind me of appointments", "organize my schedule", "track my habits",
        "help me stay focused", "make my life easier", "save me time"
      ],
      materials: [
        "paperclips and rubber bands", "duct tape", "household items",
        "things I found in my junk drawer", "basic tools", "creative improvisation"
      ],
      technology: [
        "my smartphone", "my laptop", "my smart TV", "my car's system",
        "my gaming console", "my fitness tracker"
      ],
      topic: [
        "the history of pizza", "why cats purr", "the science of happiness",
        "unusual animal facts", "the psychology of color", "the art of procrastination"
      ],
      subject: [
        "math", "history", "science", "English", "art", "music", "computer skills"
      ],
      students: [
        "elementary kids", "teenagers", "adults", "senior citizens",
        "my younger siblings", "neighborhood kids"
      ],
      school_event: [
        "the school play", "graduation", "a science fair", "a talent show",
        "a debate competition", "a sports event", "a school assembly"
      ]
    };
  }

  // Generate a random lie
  generateLie(player = null) {
    const template = this.getRandomTemplate();
    return this.fillTemplate(template, player);
  }

  // Get a random template
  getRandomTemplate() {
    return this.lieTemplates[Math.floor(Math.random() * this.lieTemplates.length)];
  }

  // Fill template with random replacements
  fillTemplate(template, player = null) {
    let filledTemplate = template;
    
    // Find all placeholders in the template
    const placeholders = template.match(/{([^}]+)}/g);
    
    if (placeholders) {
      placeholders.forEach(placeholder => {
        const key = placeholder.slice(1, -1); // Remove { and }
        if (this.replacements[key]) {
          const replacement = this.getRandomReplacement(key);
          filledTemplate = filledTemplate.replace(placeholder, replacement);
        }
      });
    }

    return filledTemplate;
  }

  // Get random replacement for a key
  getRandomReplacement(key) {
    const options = this.replacements[key];
    if (!options || options.length === 0) {
      return `[${key}]`; // Fallback if no replacements found
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  // Generate multiple lies
  generateMultipleLies(count = 5, player = null) {
    const lies = [];
    const usedTemplates = new Set();
    
    for (let i = 0; i < count && usedTemplates.size < this.lieTemplates.length; i++) {
      let template;
      do {
        template = this.getRandomTemplate();
      } while (usedTemplates.has(template) && usedTemplates.size < this.lieTemplates.length);
      
      usedTemplates.add(template);
      lies.push(this.fillTemplate(template, player));
    }
    
    return lies;
  }

  // Generate a lie that's contextually appropriate
  generateContextualLie(player, context = 'general') {
    let relevantTemplates = this.lieTemplates;
    
    // Filter templates based on context
    switch (context) {
      case 'achievement':
        relevantTemplates = this.lieTemplates.filter(t => 
          t.includes('won') || t.includes('award') || t.includes('record') || t.includes('competition')
        );
        break;
      case 'experience':
        relevantTemplates = this.lieTemplates.filter(t => 
          t.includes('once') || t.includes('accidentally') || t.includes('survived')
        );
        break;
      case 'skill':
        relevantTemplates = this.lieTemplates.filter(t => 
          t.includes('can') || t.includes('taught') || t.includes('good at')
        );
        break;
      case 'work':
        relevantTemplates = this.lieTemplates.filter(t => 
          t.includes('worked') || t.includes('hired') || t.includes('volunteered')
        );
        break;
      default:
        relevantTemplates = this.lieTemplates;
    }
    
    if (relevantTemplates.length === 0) {
      relevantTemplates = this.lieTemplates; // Fallback to all templates
    }
    
    const template = relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)];
    return this.fillTemplate(template, player);
  }

  // Add custom lie templates
  addCustomTemplate(template) {
    if (typeof template === 'string' && template.trim().length > 0) {
      this.lieTemplates.push(template.trim());
      return true;
    }
    return false;
  }

  // Add custom replacements
  addCustomReplacements(key, replacements) {
    if (typeof key === 'string' && Array.isArray(replacements)) {
      if (!this.replacements[key]) {
        this.replacements[key] = [];
      }
      this.replacements[key].push(...replacements);
      return true;
    }
    return false;
  }

  // Get statistics about the lie generator
  getStats() {
    return {
      totalTemplates: this.lieTemplates.length,
      totalReplacementCategories: Object.keys(this.replacements).length,
      totalReplacements: Object.values(this.replacements).reduce((sum, arr) => sum + arr.length, 0),
      averageReplacementsPerCategory: Object.values(this.replacements).reduce((sum, arr) => sum + arr.length, 0) / Object.keys(this.replacements).length
    };
  }
}

module.exports = LieGenerator; 