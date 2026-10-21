// All the silly comment lines. Characters + Bunny (host, and the playable finale heroine) cheer for the player and tease Puppy.
export const LINES = {
  hub: [
    'Bunny: Welcome to my Playroom! Puppy is SO nervous.',
    'Bunny: Pick a door, any door. Puppy will lose anyway.',
    'Bunny: Who is ready to tease a Puppy?',
    'Bunny: Snacks are on the house. Puppy is on the menu... of games!',
    'Bunny: Bunny is watching... no pressure.',
  ],
  start: {
    Ruby: ['Ruby: Baa-ttle time, sweetie!', 'Bunny: Ruby, show that Puppy your fluffy fists!', 'Ruby: My wool is soft. My punches are not.'],
    Glassia: ['Glassia: Run, Puppy, run!', 'Bunny: Glassia, curve it around his hiding spot!', 'Glassia: Hold your horses... nope, kicking now!', 'Puppy: Why is the ball looking at me?!'],
    Zoe: ['Zoe: Bear hugs are optional. Bonks are not!', 'Bunny: Zoe, the pan is clean. Puppy is not.', 'Zoe: Un-BEAR-ably ready!', 'Puppy: Why does she have a frying pan?!'],
    Nana: ['Nana: Nuts to you, Puppy!', 'Bunny: Nana, rain acorns on that silly boy!', 'Nana: I have been saving these ALL autumn.', 'Puppy: I brought an umbrella. I am a genius.'],
    Midnight: ['Midnight: Caw-ffee first. Then Puppy.', 'Bunny: Midnight, swoop that silly boy!', 'Midnight: The night is dark and full of Puppies.', 'Puppy: Why is the moon flapping at me?!'],
    Noir: ['Noir: Shh... I am a shadow with a beret.', 'Bunny: Noir, tiptoe, darling. Tiptoe.', 'Noir: I nap. I judge. I pounce.', 'Puppy: I feel like someone is staring at me...'],
    Iris: ['Iris: Special delivery, Puppy!', 'Bunny: Iris, recycle that Puppy!', 'Iris: One raccoon\'s trash is one Puppy\'s bonk.', 'Puppy: Why does it smell like old sandwiches up there?'],
    Linye: ['Linye: ...', 'Linye: You cannot run from your own shadow, Puppy.', 'Bunny: Ooh, the mysterious one. Show him, Linye!', 'Puppy: Who said that?! WHO SAID THAT?!'],
    Bunny: ['Bunny: Yee-haw! Round-up time, Puppy!', 'Bunny: Eight down, one Bunny to go!', 'Bunny: Run, little doggie, run!', 'Puppy: Oh no. Oh no no no. It is HER.'],
  } as Record<string, string[]>,
  hiveBonk: ['Pan-tastic!', 'BONG! Sorry Puppy!', 'Whack-a-pup!', 'Honey, you got him!', 'Sticky situation, Puppy!', 'Bear-ly fair, and we love it!', 'Puppy rang like a bell!'],
  hiveCano: ['NOT Bunny\'s Bunnycano! Combo spilled!', 'Puppy was holding Bunny\'s drink, sweetie!', 'Bunny: Hands off my Bunnycano!', 'Oops! That was a decoy Puppy!'],
  hiveBees: ['BZZT! Those are bees, not Puppy!', 'Ow ow ow! Sting!', 'Puppy hid in the BEE hive. Rude!', 'Bunny: Bees are not Puppies, darling.'],
  hiveEscape: ['Puppy: Nyeh-nyeh! Too slow!', 'Puppy: Peekaboo, I win!', 'Puppy: Smell ya later, Zoe!', 'He got away! Sticky paws, Puppy!'],
  acornHit: ['TONK! Right on the noggin!', 'Nuts to you, Puppy!', 'Acorn-tastic!', 'Squirrel strike!', 'Bunny approves of that one!', 'Puppy is now 10% acorn.'],
  acornBlock: ['PING! Off the umbrella!', 'He is hiding under a leaf! Cheeky!', 'Puppy: Umbrella! Genius move!', 'Wait for the umbrella to close, sweetie!'],
  acornMiss: ['Puppy: Missed me! Missed me!', 'That acorn is a tree now.', 'Lead your shot, Nana!', 'Puppy did a little dance. Ugh.'],
  dive: ['SNATCH! Caw-ght you!', 'Air mail Puppy!', 'Swoop-de-doo!', 'Feather-weight champion!', 'Puppy is going on a little flight!', 'Midnight delivery!', 'Bunny approves of that swoop!'],
  diveBonk: ['BONK! Chimney!', 'Ow, my beak!', 'That chimney came out of nowhere!', 'Puppy: Hah! Watch the bricks!'],
  diveSpot: ['SPOTTED! Flashlight!', 'Puppy: I see you, birdie!', 'Stay out of the light, sweetie!'],
  pounce: ['POUNCE! Gotcha!', 'Shh... boop!', 'Purr-fect timing!', 'Silent but adorable!', 'Puppy never saw it coming!', 'Ninja kitty strikes!'],
  pounceSeen: ['Puppy: I SAW that! Eek!', 'Freeze, Noir! FREEZE!', 'He turned around! Statue mode!', 'Puppy: Was that a cat? Was that a CAT?!'],
  pounceSpotted: ['Puppy: I SEE you, kitty!', 'Puppy: AAAH! A CAT! A CAAAT!', 'Busted! He spotted you, Noir!', 'Puppy: Nice try, sneaky! Byeee!'],
  pounceFled: ['Puppy ran away squealing!', 'Too noisy, sweetie. He bolted!', 'Puppy: Nope nope nope!'],
  trashHit: ['CLONK! Perfect drop!', 'Special delivery!', 'Bin-go!', 'Garbage day, Puppy!', 'Puppy got recycled!', 'Banana-rama!', 'Shoe-per shot!'],
  trashMiss: ['Missed! The pigeon is grateful.', 'Puppy: Nyeh! Missed me!', 'Wait for the shadow, sweetie!', 'That can is now modern art.'],
  trashBlock: ['BOING! Off the umbrella!', 'Puppy: Umbrella mode! Ha!', 'Wait till he closes it!'],
  // Shadow Tag catch bubbles (shown after each squash catch). Add more lines here; up to ~32 characters fits on screen at any edge.
  shadowCatch: [
'Prickly bum delivery, Puppy!',
'Sit. Stay. Good boy, Puppy!',
"Who's the boss now, Puppy?",
'Beg for mercy, Puppy-pie!',
'You make a comfy chair, Puppy!',
  ],
  // Tail Catch (bonus): Bunny's catch lines, Marc's 3 taglines only; 'Come, Puppy, follow me!' plays the lead-him-by-the-tail variant.
  tailCatch: [
    'Gotcha!',
    'This is mine!',
    'Come, Puppy, follow me!',
  ],
  // ================= EDIT ME, Marc =================
  // Tail Catch: what sneaky Bunny says while she is PULLING the tail (the tug).
  // One line per tug, picked at random (never the same line twice in a row).
  // Add, remove or reword lines freely: keep each one short (about 30 characters fits the bubble) and in quotes, with a comma after it.
  tailTug: [
    'Hehe, this tail is mine now!',
    "Where do you think you're going?",
    'Nope! Not letting go!',
    'Tug tug, little Puppy!',
    'Mine, mine, all mine!',
    'Sneaky Bunny wins again!',
    'Not so fast, Puppy!',
    'Come, Puppy, follow me!',
  ],
  // ===================================================
  // Puppy protesting while Bunny holds his tail (comic, never heart-eyed)
  tailProtest: ['Hey! My tail!', 'Not the tail!', 'Ow ow ow!', 'Unhand my fluff!', 'So undignified!'],
  // Puppy dodging / escaping (mistimed grab, front grab, lost tug)
  tailEscape: ['Nyoom!', "Can't catch me!", 'Wrong end, Bunny!', "Tail's off-limits!", 'Zoomies activated!', 'Slippery fluff!'],
  tailStart: ['Bunny: Yee-haw! Here, Puppy Puppy!', 'Bunny: That tail is MINE today.', 'Puppy: You will never catch my tail!'],
  shadowMiss: ['Too far, sweetie.', 'Puppy: Ha! I am not there!', '...hm.', 'The lantern spoiled it!'],
  lassoHit: ['YEE-HAW! Gotcha, Puppy!', 'Round-up!', 'Lasso-tastic!', 'Ride \'em, cowbunny!', 'Bunny is the boss!', 'Puppy wiggled out... after a long sulk!'],
  lassoMiss: ['Whiff! Spin it faster!', 'Puppy: Nyeh nyeh! Missed!', 'Time that release, cowbunny!', 'The lasso caught... a chair.'],
  lassoTrick: ['Puppy used a Ruby dodge!', 'Puppy opened Nana\'s umbrella!', 'Puppy grabbed a Bunnycano decoy!', 'Puppy did a Linye shadow step?!', 'Puppy: I learned from the best!'],
  linyeReveal: ['Linye: Hi hi! I\'m Linye — prickly AND adorable!', 'Linye: Puppy, wanna play tag? I\'m SUPER fast!', 'Bunny: Meet Linye the hedgehog, Puppy. Run!'],
  champion: ['Bunny: You did it! PLAYROOM CHAMPION!', 'Puppy: Best of 99 tomorrow?', 'Everyone: Sorry Puppy!'],
  golden: ['GOLDEN ACORN! Nothing stops it!', 'Bunny\'s special delivery!', 'That umbrella is toast!'],
  rubyHit: ['Sorry Puppy!', 'Boop on the snoot!', 'Fluffy fury!', 'Wool-o-punch!', 'Puppy saw stars!', 'Ewe got him!', 'Lamb-slam!', 'That one tickled... HIM!'],
  rubyDodge: ['Too slow, Puppy!', 'Missed me, woof-woof!', 'Baa-ckstep!', 'Float like a sheep!', 'Puppy punched the air!'],
  rubyHurt: ['Shake it off, Ruby!', 'Puppy got a lucky one!', 'Ouch! Wool cushion activated.', 'Hey, that was rude, Puppy!'],
  rubyBlock: ['Puppy is hiding behind his paws!', 'Wait for an opening, Ruby!', 'Guard up! Patience, sweetie.'],
  headbutt: ['WOOLLY HEADBUTT!', 'Curly cannonball!', 'Bunny approves!'],
  bonk: ['BONK! Sorry Puppy!', 'Right in the fluff!', 'Neigh-ce shot!', 'Hoof of gold!', 'Puppy saw stars!', 'Bunny approves!', 'Boing goes the Puppy!', 'Bullseye, Glassia!'],
  dodged: ['Puppy dodged! Sneaky boy!', 'He ducked! Rude!', 'Puppy did a cartwheel?!', 'Lucky wiggle, Puppy!'],
  blocked: ['He is hiding behind the bench!', 'Curve it around the cone, sweetie!', 'The goal post took one for Puppy.', 'No hiding, Puppy!'],
  miss: ['Wide! The popcorn guy ducked.', 'That ball is going to the moon!', 'Aim for the Puppy, sweetie!', 'The birds say thanks.'],
  puppyGag: ['Puppy stopped to sniff a flower!', 'Puppy is chasing a butterfly!', 'Puppy tripped on his own ears!', 'Puppy blinked. Big mistake.'],
  near: ['So close! Puppy almost cried.', 'Inches! Bunny gasped!', 'Ooooh, almost!'],
  win: ['Bunny: Bunny approves! Good girl, champ!', 'Bunny: Puppy has been thoroughly out-sassed.', 'Bunny: Write that one in the Playroom book!', 'Bunny: Puppy, you may now flop dramatically.'],
  lose: ['Bunny: Puppy got lucky. Go again!', 'Bunny: Even a Puppy wins once a year.', 'Bunny: Do not let him wag about this!', 'Bunny: Tail up, champ! Rematch!'],
  puppyWin: ['Puppy: Woof! I did a thing!', 'Puppy: Is it... is it over? Did I win?!', 'Puppy: Treat please!'],
  puppyLose: ['Puppy: I meant to do that...', 'Puppy: I need a nap.', 'Puppy: Bunny, they were mean to me!', 'Puppy: Best of 99?'],
  teaser: ['Bunny is watching...', 'Yee-haw... the finale is mine, Puppy.', 'My lasso is warming up for round nine!', 'Save the last rodeo for me!'],
  walk: ['Bunny: Next door, Puppy! Chop chop!', 'Bunny: Walk faster, Puppy! Wiggle harder!', 'Bunny: Who is a brave boy? Not you. Yet.'],
  finale: ['Round nine is mine. Puppy, practice running!', 'I am saving my lasso for last. Coming soon!', 'Champions go last, sweetie. Yee-haw!'],
  locked: ['Not yet, sweetie! Beat Puppy behind the other doors first.', 'This door is locked. Puppy hid the key in his mouth.'],
};
export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export function countLines(): number {
  let n = 0; for (const v of Object.values(LINES)) n += Array.isArray(v) ? v.length : Object.values(v).flat().length; return n;
}
