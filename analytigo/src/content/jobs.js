// Open roles. `openings` drives the count shown on the card; everything else is
// what a candidate needs before deciding to apply.

export const JOBS = [
  {
    id: 'senior-marketing-analyst',
    title: 'Senior Marketing Analyst',
    team: 'Growth',
    type: 'Full-time',
    location: 'Chennai · Hybrid',
    openings: 1,
    blurb: 'Own the numbers behind how players and venues find us — and turn them into the next thing we try.',
    about:
      'You will be the first analyst on the growth side. That means deciding what is worth measuring, building the reporting that shows it, and being the person in the room who can say whether a campaign actually worked.',
    responsibilities: [
      'Build and own acquisition reporting across web, app and venue channels',
      'Design experiments — pricing, messaging, onboarding — and call the results honestly',
      'Turn venue and player behaviour into a clear view of where growth actually comes from',
      'Work directly with the founders on where to spend next',
    ],
    must: [
      '4+ years in marketing, product or growth analytics',
      'Strong SQL and comfort with spreadsheets at scale',
      'Experience with an analytics stack (GA4, Mixpanel, Amplitude or similar)',
      'Able to explain a result to someone who has not seen the data',
    ],
    nice: ['Sport or fitness product experience', 'Python or R for deeper analysis', 'Worked at an early-stage company'],
  },
  {
    id: 'cv-engineer',
    title: 'Computer Vision Engineer',
    team: 'Engineering',
    type: 'Full-time',
    location: 'Chennai · On-site',
    openings: 2,
    blurb: 'Make a ball a few pixels wide behave like a tracked object — across four racket sports and real venue lighting.',
    about:
      'This is the core of the product. Court detection, ball and player tracking, shot segmentation and the models that turn all of it into statistics a player will actually trust.',
    responsibilities: [
      'Build and improve detection and tracking models for ball, player and court',
      'Take models from notebook to something that runs reliably on real venue footage',
      'Design the evaluation that tells us honestly how accurate we are',
      'Work with the hardware side on camera placement, calibration and lighting',
    ],
    must: [
      '3+ years building computer vision systems in production',
      'Strong Python and PyTorch',
      'Real experience with detection and multi-object tracking',
      'Comfortable with the messy end: occlusion, motion blur, poor light',
    ],
    nice: ['Pose estimation experience', 'Sports video specifically', 'Edge or on-device inference (TensorRT, ONNX, CoreML)'],
  },
  {
    id: 'video-editor',
    title: 'Video Editor',
    team: 'Brand',
    type: 'Full-time',
    location: 'Chennai · Hybrid',
    openings: 1,
    blurb: 'Cut the highlight reels, brand films and social output that make the product feel as good as it is.',
    about:
      'You will shape how Lvl-Up looks in motion — match highlights, launch films, and the short-form output that goes out every week. You will also help define the templates the product itself uses to auto-cut reels.',
    responsibilities: [
      'Edit match highlights and brand films end to end',
      'Build repeatable templates and motion presets the product can automate',
      'Produce short-form cuts for Instagram, YouTube Shorts and X',
      'Keep a consistent grade and sound across everything we publish',
    ],
    must: [
      '3+ years editing professionally, with a reel we can watch',
      'Fluent in Premiere Pro or DaVinci Resolve, plus After Effects',
      'A real eye for pacing and sound design',
      'Comfortable working to a fast weekly cadence',
    ],
    nice: ['Sports editing experience', 'Motion graphics and title design', 'Colour grading'],
  },
  {
    id: 'computer-vision-intern',
    title: 'Computer Vision Intern',
    team: 'Engineering',
    type: 'Internship · 6 months',
    location: 'Chennai · On-site',
    openings: 1,
    blurb: 'Work on real footage from real courts, alongside the engineers building the tracking stack.',
    about:
      'A genuine engineering internship, not a shadowing exercise. You will own a piece of the pipeline — data, evaluation or a model component — and see it reach production.',
    responsibilities: [
      'Help build and label the datasets our models train and are evaluated on',
      'Run experiments and report what they actually show',
      'Prototype improvements to detection or tracking',
      'Write up what you learned so the next person does not repeat it',
    ],
    must: [
      'Studying or recently finished CS, EE or similar',
      'Solid Python, and familiarity with PyTorch or TensorFlow',
      'Understands the basics of CNNs and object detection',
      'Available for six months, on-site',
    ],
    nice: ['A personal CV project we can look at', 'OpenCV experience', 'Plays a racket sport'],
  },
]

export const findJob = (id) => JOBS.find((j) => j.id === id)
