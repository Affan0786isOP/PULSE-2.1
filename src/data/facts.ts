export const REACTION_FACTS: string[] = [
  "Reaction time isn't the same as reflex time. A reflex can happen without conscious decision-making, while a reaction usually involves the brain processing information.",
  "Your brain doesn't react to the world instantly. It has to receive, process, and respond to sensory information.",
  "Visual reaction time is generally slower than auditory reaction time. Sound can trigger responses faster than seeing a visual stimulus.",
  "Touch can also produce extremely fast responses, because tactile signals can travel through relatively direct neural pathways.",
  "Simple visual reaction times are often around 200–300 ms in healthy adults, although individuals and testing conditions vary considerably.",
  "100 milliseconds is just 0.1 seconds. Tiny differences in reaction time can therefore be surprisingly difficult to perceive consciously.",
  "Reaction time can improve with practice. Repeated exposure helps your brain become more efficient at recognizing predictable stimuli.",
  "You can become faster without becoming \"smarter.\" Practice can reduce the time needed for a familiar stimulus-response task.",
  "Anticipation isn't the same as reaction. If you know when something will happen, you can begin preparing before the stimulus actually appears.",
  "This is why unpredictable reaction-time tests are important. They make anticipation much harder.",
  "Reaction time usually becomes slower when you're tired.",
  "Sleep deprivation can significantly impair attention and response speed.",
  "Your fastest possible response isn't constant throughout the day. Alertness and circadian rhythms can affect performance.",
  "Distractions can increase reaction time, even when you're not consciously paying attention to them.",
  "Multitasking can make responses slower. The brain has limited attentional resources.",
  "Choice reaction time is slower than simple reaction time. Choosing between multiple possible responses requires additional processing.",
  "The more choices you have, the more complicated the decision can become. This is related to Hick's law.",
  "Hick's law predicts that reaction time increases logarithmically with the number of choices.",
  "A reaction-time test can therefore measure more than \"reflexes.\" It can involve perception, attention, decision-making, and motor control.",
  "Your fingers aren't the only thing being measured. A reaction-time test can reveal characteristics of the entire stimulus-to-response process.",
  "The nervous system communicates using electrical and chemical signals.",
  "Neurons don't simply \"fire\" like wires carrying electricity. Communication involves complex electrochemical processes.",
  "Myelin helps many nerve signals travel faster. It acts somewhat like insulation around electrical wiring.",
  "The route from your eyes to your brain involves multiple processing stages.",
  "Your brain doesn't process every visual detail equally. Attention determines what receives more processing resources.",
  "The location of a stimulus can affect reaction time. Some positions are easier to detect or respond to than others.",
  "A larger or more noticeable stimulus can sometimes be detected faster.",
  "Contrast matters. A highly contrasting stimulus is generally easier to detect than one that blends into its background.",
  "Reaction time isn't perfectly repeatable. Even the same person can produce different results from trial to trial.",
  "That's why multiple trials are better than relying on one measurement.",
  "One unusually slow response doesn't necessarily mean something is wrong. You might have blinked, become distracted, or simply missed the stimulus.",
  "The fastest trial isn't necessarily your \"true\" reaction time either. Anticipation or random variation can make individual trials unusually fast.",
  "Averages can provide a more useful estimate of typical performance across repeated trials.",
  "The median can be useful when a dataset contains unusually slow responses.",
  "Reaction-time distributions are often not perfectly symmetrical. A few very slow trials can create a long tail.",
  "This is one reason reaction-time researchers don't always report only the average.",
  "Gaming can involve extremely fast visual decision-making, particularly when players repeatedly respond to predictable types of stimuli.",
  "But being good at a video game doesn't automatically mean having the fastest reaction time in every situation.",
  "Different reaction-time tasks measure different abilities. A mouse-click test, arrow-key test, and choice task aren't directly interchangeable.",
  "Hardware can affect measured reaction time. Your keyboard, mouse, touchscreen, display, and computer can all introduce delays.",
  "A monitor's refresh rate can affect when a visual stimulus becomes physically visible.",
  "At 60 Hz, a display refreshes approximately every 16.7 ms.",
  "At 120 Hz, that interval drops to about 8.3 ms.",
  "At 144 Hz, it's about 6.9 ms per refresh.",
  "A browser-based reaction test therefore measures more than human biology. It measures the combined effect of human response + software + hardware.",
  "Internet latency doesn't necessarily determine local reaction time. A test running entirely in your browser can measure the response locally without waiting for a server.",
  "Touchscreens can introduce additional latency compared with physical controls, depending on the device and software.",
  "\"Faster\" isn't always better in every reaction-time task. Responding too quickly can increase errors.",
  "There is often a speed–accuracy tradeoff: pushing for faster responses can sometimes reduce accuracy.",
  "Reaction time is ultimately a chain: Stimulus → sensory detection → neural processing → decision → motor command → muscle movement → recorded response. ⚡"
];

export function getRandomizedFacts(): string[] {
  const array = [...REACTION_FACTS];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
