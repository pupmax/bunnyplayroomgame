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
    // EDIT ME, Marc: Ruby's opener (last 3 are new, audit27)
    Ruby: ['Ruby: Baa-ttle time, sweetie!', 'Bunny: Ruby, show that Puppy your fluffy fists!', 'Ruby: My wool is soft. My punches are not.',
      'Ruby: Ding ding! Fluff-weight title is MINE!', 'Puppy: Why am I inside the bag?!', 'Ruby: Float like a cloud, bonk like a sheep!'],
    Glassia: ['Glassia: Run, Puppy, run!', 'Bunny: Glassia, curve it around his hiding spot!', 'Glassia: Hold your horses... nope, kicking now!', 'Puppy: Why is the ball looking at me?!'],
    Zoe: ['Zoe: Bear hugs are optional. Bonks are not!', 'Bunny: Zoe, the pan is clean. Puppy is not.', 'Zoe: Un-BEAR-ably ready!', 'Puppy: Why does she have a frying pan?!'],
    Nana: ['Nana: Nuts to you, Puppy!', 'Bunny: Nana, rain acorns on that silly boy!', 'Nana: I have been saving these ALL autumn.', 'Puppy: I brought an umbrella. I am a genius.'],
    Midnight: ['Midnight: Caw-ffee first. Then Puppy.', 'Bunny: Midnight, swoop that silly boy!', 'Midnight: The night is dark and full of Puppies.', 'Puppy: Why is the moon flapping at me?!'],
    Noir: ['Noir: Shh... I am a shadow with a beret.', 'Bunny: Noir, tiptoe, darling. Tiptoe.', 'Noir: I nap. I judge. I pounce.', 'Puppy: I feel like someone is staring at me...'],
    Iris: ['Iris: Special delivery, Puppy!', 'Bunny: Iris, recycle that Puppy!', 'Iris: One raccoon\'s trash is one Puppy\'s bonk.', 'Puppy: Why does it smell like old sandwiches up there?'],
    Linye: ['Linye: ...', 'Linye: You cannot run from your own shadow, Puppy.', 'Bunny: Ooh, the mysterious one. Show him, Linye!', 'Puppy: Who said that?! WHO SAID THAT?!'],
    Bunny: ['Bunny: Yee-haw! Round-up time, Puppy!', 'Bunny: Eight down, one Bunny to go!', 'Bunny: Run, little doggie, run!', 'Puppy: Oh no. Oh no no no. It is HER.'],
  } as Record<string, string[]>,
  // EDIT ME, Marc: Lasso opener on the /test/ build only (all doors open, so "Eight down" would not be true there). Main uses start.Bunny above.
  startBunnyTest: ['Bunny: Yee-haw! Round-up time, Puppy!', "Bunny: Saddle up, it's rodeo time!", 'Bunny: Run, little doggie, run!', 'Puppy: Oh no. Oh no no no. It is HER.'],
  hiveBonk: ['Pan-tastic!', 'BONG! Sorry Puppy!', 'Whack-a-pup!', 'Honey, you got him!', 'Sticky situation, Puppy!', 'Bear-ly fair, and we love it!', 'Puppy rang like a bell!'],
  hiveCano: ['NOT Bunny\'s Bunnycano! Combo spilled!', 'Puppy was holding Bunny\'s drink, sweetie!', 'Bunny: Hands off my Bunnycano!', 'Oops! That was a decoy Puppy!'],
  hiveBees: ['BZZT! Those are bees, not Puppy!', 'Ow ow ow! Sting!', 'Puppy hid in the BEE hive. Rude!', 'Bunny: Bees are not Puppies, darling.'],
  // EDIT ME, Marc: Hive, Puppy ducks back in before the bonk (last 3 are new)
  hiveEscape: ['Puppy: Nyeh-nyeh! Too slow!', 'Puppy: Peekaboo, I win!', 'Puppy: Smell ya later, Zoe!', 'He got away! Sticky paws, Puppy!',
    'Puppy: Whoosh! Back in the hive!', 'Puppy: Missed me by a whisker!', 'Too quick! He ducked!'],
  acornHit: ['TONK! Right on the noggin!', 'Nuts to you, Puppy!', 'Acorn-tastic!', 'Squirrel strike!', 'Bunny approves of that one!', 'Puppy is now 10% acorn.'],
  acornBlock: ['PING! Off the umbrella!', 'He is hiding under a leaf! Cheeky!', 'Puppy: Umbrella! Genius move!', 'Wait for the umbrella to close, sweetie!'],
  acornMiss: ['Puppy: Missed me! Missed me!', 'That acorn is a tree now.', 'Lead your shot, Nana!', 'Puppy did a little dance. Ugh.'],
  dive: ['SNATCH! Caw-ght you!', 'Air mail Puppy!', 'Swoop-de-doo!', 'Feather-weight champion!', 'Puppy is going on a little flight!', 'Midnight delivery!', 'Bunny approves of that swoop!'],
  // EDIT ME: Puppy's wail while Midnight carries him in her talons after a snatch (one random line per catch, no repeats)
  diveCarry: ['Puppy: Waaah! Put me down!', 'Puppy: Too high! Too HIGH!', 'Puppy: I want my mommy... and a biscuit!', 'Puppy: Puppies are NOT supposed to fly!'],
  diveBonk: ['BONK! Chimney!', 'Ow, my beak!', 'That chimney came out of nowhere!', 'Puppy: Hah! Watch the bricks!'],
  // EDIT ME, Marc: Dive, caught in a flashlight beam (last 3 are new)
  diveSpot: ['SPOTTED! Flashlight!', 'Puppy: I see you, birdie!', 'Stay out of the light, sweetie!',
    'Eek! Spotlight! Flap faster!', 'Beamed! Back to the shadows!', "Puppy: Smile, you're on camera!"],
  // EDIT ME, Marc: Box Bandit (Noir's level). Noir hides in boxes, MEOWs to lure Puppy, then BOO-X! The old pounce
  // pools (pounce / pounceSeen / pounceSpotted / pounceFled) were folded in here; a few of their best lines live on below.
  boxNoir: ['Noir: If it fits, I sits. And then I strike.', 'Noir: Shh. I am a parcel now.', 'Noir: A box is not a hiding spot, darling. It is a lifestyle.',
    'Noir: Boxes. Comfy, sneaky, purr-fect.', 'Noir: I nap. I judge. I hide in cardboard.'],
  boxMeow: ['meow?', 'mew~', 'mrrp?', 'meeeow?'],                                  // Noir throws her voice into another box
  boxLured: ['Puppy: A kitty?! Here, kitty kitty!', 'Puppy: That box meowed! I heard it!', 'Puppy: Ooh! Kitty in THAT one!', 'Puppy: Since when do boxes meow?!'],
  boxWise: ['Puppy: Not falling for THAT again!', 'Puppy: Hmm... that meow came from over HERE.', 'Puppy: Nice try. I know that trick!'],
  boxEmpty: ['Puppy: Empty... empty... EMPTY?!', 'Puppy: Just old socks.', 'Puppy: Nobody home.', 'Puppy: Where IS she?', 'Puppy: Nice box. Totally normal box.'],
  boxSniff: ['sniff sniff...', 'snff?', 'sniff... hmm.'],
  boxFeint: ['Puppy: Wait... THAT box!', 'Puppy: Hmm... it blinked.', 'Puppy: I smell kitty over there!'],
  boxFound: ['Puppy: FOUND YOU! Peekaboo!', 'Puppy: Aha! A kitty in a box!', 'Puppy: Gotcha, sneaky!'],
  boxDodge: ['Puppy: Olé! Missed me!', 'Oops! Noir dived into an empty box!', 'Puppy: Too slow, kitty!', 'Puppy: Boo-who? Nobody home!'],
  boxCount: ['Puppy: 1... 2... 3... ready or not!', 'Puppy: No peeking! Counting to three!', 'Puppy: Eyes closed! One, two, three...'],
  boxBoop: ['Shh... boop!', 'Purr-fect timing!', 'Puppy never saw it coming!', 'Ninja kitty strikes!', 'Surprise delivery!'],
  boxTug: ['Noir: Where do you think YOU are going?', 'Noir: Hold still, darling.', 'Noir: Gotcha by the fluff!', 'Noir: Mine. Paws off, darling.'],
  boxPupTug: ['Leggo my tail!', 'Nnngh!', 'Not the fluff!', 'Eek!', 'Bunny, help!'],
  boxSlip: ['Puppy: Nope nope nope!', 'Puppy: Byeee! Not today, kitty!', 'Zoom! Puppy left a dust cloud!', 'Slipped away! Grab faster, sweetie!'],
  boxBlind: ['Puppy: Who turned off the lights?!', 'Puppy: Hello? Is it bedtime?', 'Puppy: I cannot see a thing!', 'Puppy: Why is the room box-shaped?'],
  boxStamp: ['Puppy: Hey! I am NOT a letter!', 'Puppy: Why do I taste like an envelope?', 'Puppy: Did someone just MAIL me?', 'Puppy: Postage paid?!'],
  // catch payoffs (one random payoff per catch, no repeats until all 6 have played). Noir's line, then Puppy's pouty reply.
  boxSealNoir: ['Noir: Zip, zip. Sealed for freshness.', 'Noir: Handle with care, darling.', 'Noir: One puppy, boxed. Fragile.'],
  boxSealPup: ['Puppy: Hmph! I am NOT fragile!', 'Puppy: Which side is UP?!', 'Puppy: I said handle with CARE!', 'Puppy: Rude. Very rude.'],
  boxGiftNoir: ['Noir: A present! For nobody.', 'Noir: Wrapped with love. And a bow.', 'Noir: Do not open until... never.'],
  boxGiftPup: ['Puppy: Surprise... it is me. Again.', 'Puppy: I am the present?! Hmph!', 'Puppy: Ta-da... I guess.'],
  boxShipNoir: ['Noir: Express delivery. Bye-bye!', 'Noir: Next stop: far, far away.', 'Noir: Shipping is free, darling.'],
  boxShipPup: ['Puppy: Return to... ME?!', 'Puppy: Wrong address! Hmph!', 'Puppy: I want a refund!'],
  boxTurtleNoir: ['Noir: Slow and steady, darling.', 'Noir: New look. Very shell-chic.', 'Noir: Take your time. I have all day.'],
  boxTurtlePup: ['Puppy: Hey! My bum is stuck in a box!', 'Puppy: I am a turtle now. A grumpy turtle.', 'Puppy: Beep beep! Wide turtle coming through!'],
  boxHatNoir: ['Noir: Oops. Clean-up on aisle Puppy.', 'Noir: Timber!', 'Noir: Who stacked those? ...Me.'],
  boxHatPup: ['Puppy: I wanted a CROWN, not a box!', 'Puppy: Does this hat make me look boxy?', 'Puppy: Hmph. It fits, at least.'],
  boxWin: ['Noir: Return to sender, darling.', 'Noir: Signed, sealed, delivered.', 'Noir: This parcel is going straight back.'],
  boxWinPup: ['Puppy: Hey! I am NOT a parcel!', 'Puppy: ...is this the post office?', 'Puppy: Can I at least have a window seat?'],
  boxLose: ['Puppy: Nyeh nyeh! Hide and seek champion: ME!', 'Puppy: Found you more than you booped me!', 'Puppy: Woof! Puppy wins!'],
  trashHit: ['CLONK! Perfect drop!', 'Special delivery!', 'Bin-go!', 'Garbage day, Puppy!', 'Puppy got recycled!', 'Banana-rama!', 'Shoe-per shot!'],
  trashMiss: ['Missed! The pigeon is grateful.', 'Puppy: Nyeh! Missed me!', 'Wait for the shadow, sweetie!', 'That can is now modern art.'],
  // EDIT ME, Marc: Trash, junk bounces off the umbrella (last 3 are new)
  trashBlock: ['BOING! Off the umbrella!', 'Puppy: Umbrella mode! Ha!', 'Wait till he closes it!',
    'Plink! The umbrella wins this one!', 'Bounced right off! Try again!', 'Puppy: Rain, rain, go away!'],
  // ================= EDIT ME, Marc: Iris Bunny photo =================
  // A framed photo of Bunny flutters into the alley; Puppy stops dead and daydreams (heart eyes, hearts from his head). Bonk him while
  // he dreams = DREAM BONK +500. One random line per moment. Keep them short (~34 characters fits).
  // Puppy, the moment he spots the photo
  trashPhotoSee: ['Puppy: Is that... Bunny? *sigh*', 'Puppy: So fluffy... so white...', 'Puppy: Bunny dropped her photo... for ME?', 'Puppy: Those ears... those EARS...'],
  // Puppy, mid-daydream (second bubble)
  trashPhotoDream: ['Puppy: Five more minutes of dreaming...', 'Puppy: La la la... Bunny...', 'Puppy: I could look at this all day.', 'Puppy: She is SO cool. Like, SO cool.'],
  // Iris, egging you on while he dreams
  trashPhotoIris: ['Iris: Wakey wakey, lover boy!', 'Iris: Special delivery: reality!', 'Iris: Daydreaming on MY shift?', 'Iris: Snap out of it, Romeo!'],
  // Puppy, right after the DREAM BONK
  trashPhotoBonk: ['Puppy: Hey! I was in the middle of something!', 'Puppy: Rude! It was a GOOD dream!', 'Puppy: Bunny was about to wave at me!'],
  // Puppy, if you miss the window: he snaps out of it and pockets the photo
  trashPhotoPocket: ['Puppy: Mine! Going in my wallet.', 'Puppy: Shh... this stays between us.', 'Puppy: Saving this for later!'],
  // ================= end Iris Bunny photo =================
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
  // EDIT ME, Marc: Tail Catch opener (last 3 are new)
  tailStart: ['Bunny: Yee-haw! Here, Puppy Puppy!', 'Bunny: That tail is MINE today.', 'Puppy: You will never catch my tail!',
    'Bunny: Tiptoe, tiptoe... fluffy tail ahoy!', 'Puppy: My tail has a mind of its own!', 'Bunny: One little tug never hurt anyone!'],
  shadowMiss: ['Too far, sweetie.', 'Puppy: Ha! I am not there!', '...hm.', 'The lantern spoiled it!'],
  // ================= EDIT ME, Marc: PLAYROOM RODEO (Lasso finale, rework) =================
  // Bunny's line when a loop lands on Puppy (shown in a bubble over the rodeo floor)
  lassoHit: ['YEE-HAW! Gotcha, Puppy!', 'Round-up!', 'Lasso-tastic!', 'Ride \'em, cowbunny!', 'Bunny is the boss!', 'Puppy wiggled out... after a long sulk!'], // Marc's own lines, kept verbatim (finale patch had rewritten them)
  // a loop lands on the floor (missed)
  lassoMiss: ['Whiff! Lead him a little!', 'Puppy: Nyeh nyeh! Missed!', 'Throw where he is GOING!', 'The lasso caught... a sock.'],
  // round 2 decoy: Puppy swaps in a cardboard Puppy and tiptoes off
  lassoTrick: ['Puppy: Which one is the REAL me? Hehe!', 'Puppy: Cardboard me is a great actor!', 'Puppy: Tiptoe, tiptoe...'],
  // round banners (Puppy's line under the banner): index 0 = round 2 (SNEAKY), 1 = round 3 (ZOOMIES)
  lassoRound: ['Puppy: Okay, time to get SNEAKY!', 'Puppy: ZOOMIES MODE! Out of my way!'],
  // Bunny while she reels him in (tap-fast tug)
  lassoTug: ['Bunny: Reel him in!', 'Bunny: Heave... HO!', 'Bunny: Come here, you!', 'Bunny: Yee-haw, little doggie!'],
  // Puppy's shouts while he pulls back on the rope
  lassoTugPup: ['Grr!', 'Nope!', 'Hnngh!', 'Mine!', 'Not today!'],
  // the tug failed and the loop slipped off
  lassoSlip: ['He wriggled free!', 'Slippery Puppy!', 'Slipped the loop!'],
  // Puppy hog-tied for a moment after each catch (protest bubble)
  lassoTied: ['Puppy: Hey! This is NOT a hug!', 'Puppy: Untie me! I have a NAP booked!', 'Puppy: Rude! I was napping in there!', 'Puppy: I am NOT a pony!',
    'Puppy: This knot is very... knotty.', 'Puppy: Tell my squeaky toy I love it.'],
  // the catch hang (rotates A / B / C across the catches): A = dangling from the ceiling hook, B = the same but spinning, C = by his knees from the lamp bar
  lassoHangBun: ['Bunny: Yee-haw! Hang in there, partner!', 'Bunny: Puppy on a string!', 'Bunny: Hold still... for the photo!'],
  lassoHangPup: ['Puppy: Hmph! ...hehe.', 'Puppy: I meant to do this.', 'Puppy: The view is great from up here!'],
  lassoSpinPup: ['Puppy: Wheee... the room is spinning~', 'Puppy: Which way is up?', 'Puppy: Again! ...no, wait.'],
  lassoLampBun: ['Bunny: Nice catch... by the LAMP!', 'Bunny: Look, a Puppy bat!'],
  lassoLampPup: ['Puppy: Ta-daa...? Hmph.', 'Puppy: Totally planned. Ten out of ten.', 'Puppy: Just hanging out!'],
  // the couch giggling at the hang (little pops over the girls)
  lassoGiggle: ['hee hee!', 'tee-hee!', 'hihi!', 'giggle!'],
  // round 3: Puppy charges Bunny. Bunny dodges and he faceplants / or he bonks her
  lassoFaceplant: ['Puppy: Ow, my snoot!', 'Puppy: Who moved the Bunny?!', 'Puppy: The floor came out of nowhere!'],
  lassoBonk: ['Puppy: Beep beep! Coming through!', 'Puppy: Zoomies always win!', 'Puppy: Bonk! Tag, you\'re it!'],
  // the girls on the couch: a whispered tip-off when Puppy pulls a decoy or winds up a charge (light flavour)
  lassoCouchTip: ['Noir: Psst! That one is cardboard.', 'Iris: The real Puppy has crumbs on him!', 'Midnight: Caw! He is tiptoeing away!', 'Linye: ...the OTHER one, hi hi!'],
  lassoCouchCharge: ['Ruby: He is charging! Swipe, Bunny!', 'Zoe: Bear-ly in time! DODGE!', 'Nana: Nuts! Here he comes!'],
  // couch cheers after a catch (sometimes)
  lassoCouchCheer: ['Ruby: Baa-rilliant!', 'Zoe: Un-BEAR-lievable!', 'Nana: Nuts! Nice throw!', 'Glassia: Yee-HAY!', 'Midnight: Caw-boy... I mean cow-BUNNY!'],
  // win outro: Bunny drags the hog-tied Puppy off by the rope
  lassoOutroBun: ['Bunny: Come along, little doggie!', 'Bunny: Off to the winners\' corner, partner!'],
  lassoOutroPup: ['Puppy: My dignity!', 'Puppy: Not in front of the COUCH!', 'Puppy: I demand a rematch! ...after snacks.'],
  // loss card (time ran out): Puppy's gloat + Bunny's comeback
  lassoPupWin: ['Puppy: Wheee! The rope only got my tail!', 'Puppy: Can\'t rope THIS Puppy! ...This time.', 'Puppy: Untied and unstoppable!',
    'Puppy: I wiggled out! Wiggle power!', 'Puppy: The couch was rooting for me. Secretly.'],
  lassoBunLose: ['Bunny: One more loop and he was MINE!', 'Bunny: Saddle up, we go again!', 'Bunny: Next time, partner. Next time.'],
  linyeReveal: ['Linye: Hi hi! I\'m Linye — prickly AND adorable!', 'Linye: Puppy, wanna play tag? I\'m SUPER fast!', 'Bunny: Meet Linye the hedgehog, Puppy. Run!'],
  champion: ['Bunny: You did it! PLAYROOM CHAMPION!', 'Puppy: Best of 99 tomorrow?', 'Everyone: Sorry Puppy!'],
  // EDIT ME, Marc: Acorn, golden acorn hit (last 3 are new)
  golden: ['GOLDEN ACORN! Nothing stops it!', 'Bunny\'s special delivery!', 'That umbrella is toast!',
    'Golden acorn, coming through!', 'Shiny and unstoppable!', 'Umbrella? What umbrella?'],
  // Boxing: Ruby's own lines (now used in her level: rubyHit = she lands one, rubyDodge = she dodges, rubyHurt = she gets bonked,
  // rubyBlock = she swings outside the green, headbutt = SUPER SWING, near = a swing that only just missed the green)
  rubyHit: ['Sorry Puppy!', 'Boop on the snoot!', 'Fluffy fury!', 'Wool-o-punch!', 'Puppy saw stars!', 'Ewe got him!', 'Lamb-slam!', 'That one tickled... HIM!'],
  rubyDodge: ['Too slow, Puppy!', 'Missed me, woof-woof!', 'Baa-ckstep!', 'Float like a sheep!', 'Puppy punched the air!'],
  rubyHurt: ['Shake it off, Ruby!', 'Puppy got a lucky one!', 'Ouch! Wool cushion activated.', 'Hey, that was rude, Puppy!'],
  rubyBlock: ['Puppy is hiding behind his paws!', 'Wait for an opening, Ruby!', 'Guard up! Patience, sweetie.'],
  headbutt: ['WOOLLY HEADBUTT!', 'Curly cannonball!', 'Bunny approves!'],
  // ================= EDIT ME, Marc =================
  // Boxing: Puppy (in the bag) talking. hit = a normal hit (25%), perfect = PERFECT hit, incoming = the bag swings back at Ruby (15%),
  // bonk = Ruby gets bonked, open = wobbly bag after a dodge, whiff = Ruby swung outside the green. The new audit27 lines are the last 2 in hit + incoming.
  boxingPup: {
    hit: ['MY SNOOT! wheee-ouch!', 'Nice one! Do it again! …wait, no!', 'Wheee! Ten outta ten!', 'Ow! Great form though!', 'Boing! I felt that in my tail!', 'That one had SPARKLES!',
      'Bonk! Right on the button!', "Oof! That's a good one!"],
    perfect: ['PERFECT! I saw stars AND confetti!', 'Bullseye! Right on the BONK!', 'Wow, textbook! Ow.'],
    incoming: ['INCOMIIING! mind the fluff!', 'Duck, Ruby, duck!', 'Here I come — sorry in advance!', 'Wheeee — look out!',
      'Swing time! Watch the bag!', 'Wobble-wobble, here it comes!'],
    bonk: ["Oopsie! Bag 1, Ruby 0! Shake it off — you're doing GREAT! ♥", 'Eep, sorry! You okay? You GOT this!', 'Boop! My bad! Go again, champ!', 'Whoops! Fluffy hug delivered!'],
    open: ["I'm all wobbly — free hits!", 'Dizzy bag! Dizzy bag!', 'Wheee, the room is spinning!'],
    whiff: ['Missed me! Try the green bit!', 'Swish! Wait for the green!', 'Ha! Timing, timing!'],
  },
  // ===================================================
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
  // ================= EDIT ME, Marc: GLASSIA "PENALTY PUP" (door 2, Football scene) =================
  // Glassia takes penalties, Puppy is the goalkeeper. One random line per moment, no repeats until a pool runs out.
  // Keep each line short (about 32 characters fits a bubble). Family-friendly slapstick only.
  penStart: ['Glassia: Neigh-ver look where I kick!', 'Glassia: Mane event, coming up!', 'Glassia: Ready, Puppy? I was born ready. Foaled ready.'],
  penGlassia: ['Glassia: Left or right, Puppy? Guess!', 'Glassia: Hold your horses...', 'Glassia: Straight from the stable!', 'Glassia: Watch the hoof, not the pony!', 'Glassia: This one has your name on it.'],
  // Puppy while he wiggles (his tell)
  penTell: ['Puppy: I am NOT going this way.', 'Puppy: Wiggle wiggle wiggle...', 'Puppy: Totally relaxed. Very calm.', 'Puppy: Eyes on the ball. Ball. BALL.'],
  // after a fake-out (shots 4-6, sometimes 7-8)
  penFeint: ['Puppy: Left! No, right! No, LEFT!', 'Puppy: Wiggle wiggle... gotcha!', 'Puppy: Psych! Fooled ya!', 'Puppy: Fake! I am a master of disguise.'],
  // shot 7: Puppy puts on the giant gloves
  penGloves: ['Puppy: Behold! The MEGA mittens!', 'Puppy: Glove-ly upgrade, if I say so!', 'Puppy: Nothing gets past these!'],
  // Glassia shot BEFORE he dived: he saves it (the very first early save always uses the first line)
  penSave: ['Puppy: Paws of steel!', 'Puppy: The wall says NO!', 'Puppy: Did EVERYONE see that?!', 'Puppy: Too early, pony!'],
  // Glassia shot to the side he dived to
  penBlock: ['Puppy: Oof! Saved it with my tummy!', 'Puppy: I meant to do that.', 'Puppy: Ha! Right where I was lying!'],
  // Glassia after a save
  penOops: ['Glassia: Hay! Too soon!', 'Glassia: Wait for the dive, Glassia...', 'Glassia: Okay, that was a warm-up.', 'Glassia: Neigh! He read me!'],
  // banner / announcer after a goal
  penGoal: ['GOAL! Puppy dove into next week!', 'Wrong way, Puppy!', 'Back of the net!', 'Puppy saved... the grass.'],
  // Glassia after a goal
  penCheer: ['Glassia: Hoof-ball, baby!', 'Glassia: Gallop-ing goodness!', 'Glassia: Neigh-ce!', 'Glassia: Straight in the stable!'],
  // Puppy after the slapstick (post bonk, net face-plant, tummy slide)
  penPup: ['Puppy: Who moved the post?!', 'Puppy: I am... part of the net now.', 'Puppy: My tummy is a sledge.', 'Puppy: Ow. My everything.', 'Puppy: I saw stars AND planets!'],
  // NOGGIN BONK: a middle chip lands on a diving Puppy's head
  penNoggin: ['NOGGIN BONK!', 'Puppy: My beautiful head!', 'Glassia: Header assist, thanks Puppy!'],
  // she waited too long after the dive and he got back up
  penSlow: ['Puppy: Too slow, pony! Again!', 'Puppy: I got bored and stood up.', 'Puppy: Shoot already, slowpoke!'],
  // banners
  penLast: ['LAST SHOTS! Watch out for the MEGA mittens!'],
  penMust: ['Bunny is watching... every shot counts!'],
  // win outro: the net wraps Puppy like a burrito (the first line always plays)
  penWin: ['Glassia: Puppy, you are officially NETTED!', 'Glassia: Hoof-ball 1, Puppy 0!'],
  penFish: ['Puppy: I am a fish now. A fluffy fish.'],
  // loss card: big line, then Puppy's line
  penLose: ['So close! Wait for the dive, then shoot!', 'Puppy read your hooves this time!', 'Shake out that mane and try again!'],
  penLosePup: ['Puppy: Paws of steel! Undefeated!', 'Puppy: Best keeper in the Playroom!', 'Puppy: Come back when you can wiggle-read!'],
  // ================= end GLASSIA "PENALTY PUP" =================
  // ================= EDIT ME, Marc: PENALTY PUP v2 "READ & SHOOT" (new pools; the ones above still play too) =================
  // Puppy LEANS to guess, Glassia shoots the OTHER corner on green. Keep lines short, family-friendly slapstick.
  // Puppy while the ring is yellow (he is reading her)
  penRead: ['Puppy: I can read you like a bone menu.', 'Puppy: Hmm... I sniff a LEFT. Or a right.', 'Puppy: My nose knows!'],
  // Puppy when he swaps his lean
  penSwap: ['Puppy: Changed my mind!', 'Puppy: Other way! No... this way!', 'Puppy: Wiggle switch!'],
  // she kicks straight at him in the middle (tummy catch)
  penMidSave: ['Puppy: Tummy catch! Delicious.', 'Puppy: Right into my fluffy belly!', 'Puppy: You kicked it TO me? Thanks!'],
  // Glassia after he guesses right and saves
  penOops2: ['Glassia: Hay! I kicked where he leaned!', 'Glassia: Other corner next time!', 'Glassia: Neigh! Read his lean, Glassia!'],
  // banner when the bluffs start (shots 7-8)
  penBluff: ['He BLUFFS now! His TAIL never lies!'],
  // rule pill on the bluff shots (shots 7-8)
  penBluffRule: ['BLUFF! Shoot AWAY from his TAIL!'],
  // shots 7-8: he dives the wrong way and does a double-take
  penWrongWay: ['Puppy: Wait... wrong way?!', 'Puppy: My tail TOLD on me!', 'Puppy: Who put the ball THERE?!'],
  // loss card big line (mixed with penLose minus the old dive line)
  penLose2: ['So close! Shoot AWAY from his lean!', 'Watch his tail on the last shots!'],
  // ================= end PENALTY PUP v2 =================
  // ================= EDIT ME, Marc: PENALTY PUP "REBOUND BONK" (after a goal: quick second ball at his head, points only) =================
  // Glassia after she bonks his head (the FIRST bonk of a game always uses line 1, Marc's line; after that they rotate)
  penBonk: ['Glassia: Oops, sorry I did not mean to... haha!', 'Glassia: Oopsie! My hoof slipped... hehe.', 'Glassia: Sorry, sorry! ...Not sorry. Haha!', 'Glassia: Whoops! That ball REALLY likes you, Pup.', 'Glassia: Oh no, your poor head! ...Anyway, haha!'],
  // Puppy, flustered, after the bonk
  penBonkPup: ['Puppy: HEY! The goal was ALREADY in!', 'Puppy: Ow! You did that on PURPOSE!', 'Puppy: My noggin! I am telling Bunny!', 'Puppy: Rude. Cute, but RUDE.', 'Puppy: Seeing stars... and one smug pony.'],
  // the big prompt when the window opens, and the small note when it closes unused / missed
  penBonkPrompt: ['BONK HIM!'], penBonkSlow: ['too slow!'], penBonkMiss: ['missed!'],
  // ================= end REBOUND BONK =================
  // ================= NANA "ACORN BARRAGE" twists: tail whack, snack thief, seeing stars, K.O. =================
  // EDIT ME: Puppy/Nana banter for the new Acorn Barrage moments (smug + sneaky, the odd sweet one). Hints are the one-line tutorials.
  acornHint: { swat: '❗ Tail wiggle = he WHACKS it back. WAIT!', munch: 'He\'s eating your acorn! BONK him first!', stars: '⭐ Seeing stars: every hit counts DOUBLE!' },
  // the tell: he crouches, tail cocked
  acornTell: ['Puppy: Go on. Throw it. I dare you.', 'Puppy: My tail is loaded, sweetie.', 'Puppy: Try me, squirrel girl~', 'Puppy: Batter up!'],
  // Nana threw into it: he whacks it back up at her
  acornSwat: ['Puppy: Return to sender, cutie!', 'Puppy: Tail-whack! Did you SEE that?', 'Puppy: Black belt in tail, babe.', 'Puppy: Fetch! Oh wait, that is MY line.', 'Puppy: Home run! I am a legend.'],
  acornNanaBonk: ['Nana: OW! My own acorn?!', 'Nana: Okay. Rude. Noted.', 'Nana: That tail is getting confiscated.', 'Nana: Seeing... squirrels...'],
  // he grabbed a missed acorn and is munching it
  acornMunch: ['Puppy: Free snack! Thanks, babe.', 'Puppy: Mmm... crunchy AND disrespectful.', 'Puppy: Finders keepers, nutcase.', 'Puppy: Nom nom. Don\'t mind me.'],
  acornGulp: ['Puppy: GULP! Ooh, sugar rush!', 'Puppy: Delicious. Throw me another, cutie.', 'Puppy: Healed! Acorns are a superfood.', 'Puppy: Zoomies unlocked!'],
  acornSnack: ['Nana: Paws off my acorns, Puppy!', 'Nana: That was MY lunch!', 'Puppy: Mmf! Rude! I was CHEWING!', 'Nana: Spit it out, cheeky.'],
  // near miss: whooshed past his ear
  acornNear: ['Puppy: Whoa! That one parted my fur!', 'Puppy: Close... but not close enough, sweetheart.', 'Puppy: I felt the breeze. Thrilling.', 'Nana: Next one has your name on it.'],
  // hits while he is seeing stars (count double)
  acornStars: ['Puppy: Wheee... pretty stars...', 'Puppy: Who turned the forest upside down?', 'DOUBLE TONK! He did not even see it!', 'Puppy: Five Nanas?! That is not fair!'],
  // the winning K.O. beat
  acornKO: ['Puppy: I regret... nothing... ugh.', 'Nana: Nuts to you, cutie.', 'Puppy: Okay, you win... can I keep ONE acorn?', 'Nana: Sleep tight, fluffball. Mwah!'],
  // ================= end NANA "ACORN BARRAGE" twists =================
};
/** Shared no-repeat picker (audit27): every pool gets its own shuffle-bag, so no line repeats until the whole pool has been
 *  used, and the same line never plays twice in a row (also across a refill). Keyed by the pool's contents, so LINES pools and
 *  inline word lists (e.g. ['POW!', 'BOP!']) all remember their bag across rounds. */
const bags = new Map<string, { left: number[]; last: number }>();
export function pick<T>(a: readonly T[]): T {
  if (a.length <= 1) return a[0];
  const key = a.join('\u0001'); let b = bags.get(key); if (!b) { b = { left: [], last: -1 }; bags.set(key, b); }
  if (!b.left.length) {
    b.left = a.map((_, i) => i); for (let i = b.left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b.left[i], b.left[j]] = [b.left[j], b.left[i]]; }
    if (b.left[b.left.length - 1] === b.last) [b.left[0], b.left[b.left.length - 1]] = [b.left[b.left.length - 1], b.left[0]];
  }
  const i = b.left.pop()!; b.last = i; return a[i];
}
export function countLines(): number {
  let n = 0; for (const v of Object.values(LINES)) n += Array.isArray(v) ? v.length : Object.values(v).flat().length; return n;
}

// ================= EDIT ME, Marc: cheeky Bunny & Puppy =================
// Cheeky pass (27 Oct, take 2: "sneaky" rewrite): Bunny is the smug little schemer who loves catching, tying up and bossing her Puppy
// around; Puppy is the flustered, half-willing captive. Mostly sneaky / smug / teasing, with about 1 in 5 lines a halfway-sweet sneaky
// one (marked "// sweet-ish"). PG-13 winks only: every joke should read innocent on the surface. Nothing above was changed: each scene
// mixes its old pool with the matching pool below, so the shared no-repeat picker shuffles old and new lines together. Add, remove or
// reword lines freely (keep the "Name: " prefix, it decides who says it). Card lines: about 45 characters fit. Bubble lines: about 36.
export const CHEEKY = {
  // ---- level end card (shared card in systems/endcard.ts) ----
  // a girl WON: Bunny's line on the card (mixed with LINES.win) ...
  cardWin: ['Bunny: Caught again? You make it too easy.', 'Bunny: Flat on your back. Right where I want you.', 'Bunny: Lose for them, Puppy. Get caught for me.',
    'Bunny: Bad boy. Tickle punishment later. Hehe.', "Bunny: Struggle more, Puppy. It's cuter.", 'Bunny: Every door leads back to me, Puppy.',
    'Bunny: Sit. Stay. Stay caught.',
    'Bunny: Poor thing. Fine, one kiss. Then the leash.'], // sweet-ish
  // ... and Puppy's reply under it (mixed with LINES.puppyLose; also used on the interlude flop)
  cardWinPup: ["Puppy: I wasn't caught! I was... resting.", 'Puppy: Why is everyone carrying rope today?!', 'Puppy: Please not the tickles. ...Okay, maybe.',
    "Puppy: I can escape anytime. I just... don't.", 'Puppy: Who keeps putting collars on me?!', 'Puppy: This is fine. I am a very free dog.',
    "Puppy: Bunny's grinning. That's never good.",
    "Puppy: If someone keeps me, I hope it's you."], // sweet-ish
  // Puppy WON: Bunny's line (mixed with LINES.lose) ...
  cardLose: ["Bunny: Enjoy your freedom. It's a loan.", "Bunny: Run, Puppy. I'll get the long rope.", "Bunny: Cute escape. I'm counting them, you know.",
    'Bunny: Wag while you can, Puppy.', 'Bunny: Every escape adds one tickle. Hehe.', 'Bunny: Lucky. Next round, the leash comes out.',
    'Bunny: Go on. Sleep with one eye open.',
    "Bunny: Fine, you win. Come here, I'll reward you."], // sweet-ish
  // ... and Puppy's gloat (mixed with LINES.puppyWin)
  cardLosePup: ['Puppy: Free! Free! ...Why is Bunny smiling?', 'Puppy: Not caught! Write that down, Bunny!', 'Puppy: No collar today, thank you very much!',
    'Puppy: I am un-catchable! Mostly. Sometimes.', 'Puppy: Untied, unbagged, un-tickled! Woof!', 'Puppy: Victory lap! ...Away from Bunny.',
    'Puppy: Ha! Your knots need practice, Bunny.',
    "Puppy: Won it for you, Bunny. Don't tell anyone."], // sweet-ish
  // level-aware win lines (about half of all wins use one). A "Puppy:" line goes in his slot, a "Bunny:" line in hers. Last one is sweet-ish.
  cardWinBy: {
    Ruby: ["Bunny: Ruby bagged you? The bag's mine next.", 'Puppy: Bagged. Again. Is this a theme?', 'Bunny: Ruby softens him up. I collect.',
      "Puppy: Ruby punches. Bunny plans. I'm doomed.", 'Bunny: Knocked out? Perfect time for the leash.', "Bunny: Bruised? Aww. I'll kiss it. Then tie it."],
    Glassia: ["Bunny: Netted! Hold still, I'm keeping this one.", 'Puppy: Caught in a net. Again. By a pony.', 'Bunny: Nice dive. Straight into my trap.',
      'Bunny: Keeper? No. Kept? Yes.', 'Puppy: Why do all goals lead to Bunny?', 'Bunny: So brave. My brave little hostage.'],
    Zoe: ['Bunny: Bonked and sticky. Easy to carry off.', "Puppy: Zoe's pan was the warm-up, wasn't it?", 'Bunny: Ding dong! Who ordered one Puppy?',
      'Bunny: Honey trap worked. Of course it did.', "Puppy: I'm stuck. Literally. Honey. Help.", 'Bunny: Sticky AND dizzy. Cute. Hold my paw.'],
    Nana: ['Bunny: Umbrella down? Nowhere to hide now.', 'Puppy: Acorns from above. Bunny from behind.', 'Bunny: Nana bonks. I keep. Teamwork.',
      'Bunny: Seeing stars? Count them while I tie.', 'Puppy: My noggin hurts. Please, no tickles.', "Bunny: Poor noggin. One smug kiss. That's all."],
    Midnight: ['Bunny: She flew you to my door. Good bird.', "Puppy: Kidnapped by a raven. Bunny, jealous?", 'Bunny: Air mail Puppy. Signed for. Mine.',
      'Bunny: Nobody steals my Puppy. Except me.', 'Puppy: I hate heights. I hate rope more. Maybe.', 'Bunny: You came back to me. Even by talon.'],
    Noir: ["Bunny: Boxed up for me? You shouldn't have.", "Puppy: I'm a parcel now. Return to sender!", 'Bunny: Fragile. This side up. Property of Bunny.',
      'Bunny: Head in a box. Tail in my paw.', 'Puppy: The kitty tricked me. Bunny trained her.', 'Bunny: Gift-wrapped Puppy. Best present ever.'],
    Iris: ["Bunny: Taken out with the trash? I'll take you in.", 'Puppy: Iris dumped me. Bunny picked me up. Uh-oh.', 'Bunny: Smelly and caught. Bath time. No escape.',
      "Bunny: One raccoon's trash, one Bunny's captive.", 'Puppy: Bunny, why do you have soap AND rope?', 'Bunny: Stinky. Still mine. Come here.'],
    Linye: ['Bunny: Sat on by a hedgehog. Warm-up done.', 'Puppy: Linye uses me as a chair. Bunny, a toy.', "Bunny: Tag, you're it. Then you're mine.",
      'Bunny: Shadow caught. The real thing is next.', 'Puppy: Just me and Bunny now. Gulp.', 'Bunny: Brave boy. You earned a kiss. And a knot.'],
    // bonus Tail Catch (Bunny herself won)
    Bunny: ['Bunny: Got your tail. The Puppy comes with it.', "Bunny: Tug tug. Who's following who now?", "Puppy: Gentle! That's attached!",
      'Bunny: Heel, Puppy. Good boy. Finally.', 'Bunny: Caught by the tail. Leash next. Hehe.', "Puppy: Pull gently... I'm not complaining."],
  } as Record<string, string[]>,
  // ---- interlude, beat 3: Puppy walks to the next door, Bunny sips and tugs his leash. [first line, reply]; either can be Bunny or Puppy.
  //      Last pair per girl is sweet-ish. ----
  walkBy: {
    Ruby: [['Bunny: Ruby bagged you. I tie the bow.', 'Puppy: Why does it need a bow?!'], ['Bunny: You got punched right into my plan.', "Puppy: There's a PLAN?!"],
      ['Bunny: Ding ding! Round two is mine.', 'Puppy: Can I tap out? ...No?'], ['Bunny: Wobbly legs? Easier to catch.', 'Puppy: Stop grinning like that!'],
      ['Bunny: Ruby softened you up. Thanks, Ruby!', "Puppy: I'm not a steak!"], ['Bunny: Bruised? Here. One kiss. Shh.', 'Puppy: ...Can I get bruised again?']],
    Glassia: [['Bunny: Caught in her net, were we?', 'Puppy: That net was your idea, right?'], ["Bunny: You're a keeper. So I'm keeping you.", "Puppy: That's not what keeper means!"],
      ['Bunny: Dive left, dive right. Land on me.', 'Puppy: Is this still football?'], ['Bunny: Hold your horses, Puppy.', 'Puppy: Hold your lasso, Bunny!'],
      ['Bunny: Whistle! Penalty: tickles.', 'Puppy: That rule is NOT real!'], ['Bunny: Nice saves. My hero. My hostage.', 'Puppy: Pick ONE, Bunny!']],
    Zoe: [['Bunny: Honey, you got bonked.', 'Puppy: You say honey like a threat.'], ['Bunny: Sticky paws? Rope sticks better.', 'Puppy: Why do you know that?!'],
      ["Bunny: Zoe's pan rang the dinner bell.", "Puppy: Who's dinner? ...Oh no."], ['Bunny: In and out of that hive all day.', 'Puppy: Hiding. From you. Mostly.'],
      ['Bunny: Buzz buzz. Caught in my web.', "Puppy: Bees don't even have webs!"], ['Bunny: Sticky and sweet. Like me.', "Puppy: You're sneaky. Sweet is a stretch."]],
    Nana: [['Bunny: Umbrella up? Cute. Useless.', "Puppy: It's a shield! From acorns. And you."], ['Bunny: She saved acorns all autumn.', "Puppy: You saved rope all year, didn't you?"],
      ['Bunny: Bonk count: a lot.', 'Puppy: Tickle count: please zero.'], ['Bunny: Seeing stars? Follow the pretty one.', 'Puppy: The pretty one has a rope!'],
      ['Bunny: Squirrels hoard nuts. I hoard Puppies.', 'Puppy: Just one Puppy, right? RIGHT?'], ['Bunny: Poor noggin. Fine. Kiss.', 'Puppy: ...Ow. Wait. Again?']],
    Midnight: [['Bunny: Flying with other girls now?', "Puppy: She grabbed ME! I'm the victim!"], ['Bunny: Up all night, Puppy?', 'Puppy: Who can sleep with you watching?'],
      ['Bunny: She swept you off your feet.', "Puppy: You'll do it with a lasso."], ['Bunny: Air mail Puppy. Delivered to me.', 'Puppy: I did NOT sign for this!'],
      ['Bunny: Feathers in your fur? Explain.', "Puppy: It's not what it looks like!"], ['Bunny: Missed you up there. A little.', 'Puppy: Wait, really? ...A little?']],
    Noir: [['Bunny: Did the kitty play with you?', "Puppy: She played me. There's a difference."], ['Bunny: You got packed and shipped.', 'Puppy: To who?! ...Oh. To you.'],
      ['Bunny: Peekaboo! Found you. Always.', "Puppy: That's the scary part!"], ['Bunny: Stamped, sealed, mine.', 'Puppy: Where do I file a complaint?'],
      ['Bunny: Head in a box, tail in my paw.', 'Puppy: Let go! ...Okay, hold it gently.'], ['Bunny: Best parcel I ever got.', "Puppy: I'm blushing. In a box."]],
    Iris: [['Bunny: You stink, Puppy. Bath time.', 'Puppy: Why are you holding rope AND soap?'], ["Bunny: Garbage day. I'll take you out.", 'Puppy: That sounds like a threat!'],
      ['Bunny: She stole your snacks, huh?', "Puppy: And you'll steal the rest of me."], ['Bunny: Banana peel hat. Captive chic.', 'Puppy: Stop saying captive chic!'],
      ['Bunny: Trashed by a raccoon. Tsk tsk.', "Puppy: You're taking notes. I see you."], ['Bunny: Stinky. Still my favourite.', 'Puppy: ...Say that again. Slower.']],
    Linye: [['Bunny: Did a hedgehog sit on you?', 'Puppy: Is everyone just sitting on me now?'], ["Bunny: Tag! You're it. Then you're mine.", "Puppy: That's not how tag works!"],
      ['Bunny: Shadow caught. You next.', 'Puppy: Can my shadow go instead?'], ['Bunny: Comfy chair, are we?', 'Puppy: Comfy captive. Apparently.'],
      ["Bunny: Now it's just you and me.", 'Puppy: Gulp. Lasso time?'], ['Bunny: Last door. Then you rest. With me.', 'Puppy: Rest, or REST rest?']],
  } as Record<string, [string, string][]>,
  // any level (mixed into every walk, together with Marc's LINES.walk). The carrot gag needs "carrot in your pocket" in the line.
  walkAny: [['Bunny: Next door, Puppy. Walkies!', 'Puppy: Why do walkies need a leash?!'], ['Puppy: Is that a carrot in your pocket or...', "Bunny: It IS a carrot. It's bait."],
    ["Bunny: Who's a good boy? Not you. Good.", 'Puppy: Bad boys get chased. Uh-oh.'], ['Puppy: Careful, I bite!', 'Bunny: Cute. I tickle.'],
    ['Bunny: Struggle harder. It helps. Me.', "Puppy: That's... not encouraging!"], ['Bunny: Collar or bow tie? Pick one.', "Puppy: Can I pick 'run'?"],
    ['Bunny: Psst. You look cute caught.', 'Puppy: Stop it! ...No, keep going.']] as [string, string][], // last pair sweet-ish
  // ---- interlude, beat 2: under "Bunny is watching..." (mixed with LINES.teaser) ----
  teaser: ['My lasso is warming up. Hehe.', 'Run all you want, Puppy. I like a chase.', 'Round nine, Puppy. Wear something tie-able.',
    "I don't chase boys. I lasso them.", 'Rope? Check. Hat? Check. Puppy? Soon.', 'Every door you open leads back to me.',
    'Save your last wag for me, Puppy.'], // sweet-ish
  // ---- interlude, Linye's reveal (mixed with LINES.linyeReveal) ----
  linyeReveal: ['Linye: Hi hi! Puppy, you look... sit-able.', 'Bunny: Linye catches shadows. I catch the rest.', "Linye: Bunny says you're hers. Tag anyway?",
    'Linye: Comfy chair spotted! Hi hi!', 'Bunny: Wear him out, Linye. I want him tired.',
    'Bunny: Be nice, Linye. Only I get to tease him.'], // sweet-ish
  // ---- hall greeting bubble (mixed with LINES.hub) ----
  hub: ["Bunny: Pick a door. Puppy's behind all of them.", "Bunny: Welcome! Puppy's my favourite toy.", "Bunny: Play nice, girls. He's MY chew toy.",
    "Bunny: Puppy's been a bad boy. Go catch him.", 'Bunny: Catch him, wrap him, bring him to me.', 'Bunny: No biting. Unless he asks nicely.',
    'Puppy: Bunny, why is everyone holding rope?!',
    'Bunny: Bring him back in one piece. I like him.'], // sweet-ish
  // ---- hall, tapping the locked finale door (mixed with LINES.finale) ----
  finale: ['Saving my lasso for last. Hehe.', 'Patience. The boss always goes last.', 'Rope practice later. Puppy volunteered.',
    'Not yet! Wear him out behind the other doors.', "My door opens when he's nice and tired.",
    "Last door's mine. So is he. Eventually."], // sweet-ish
  // ---- Champion ending bubble (mixed with LINES.champion) ----
  champion: ['Bunny: Champion! Now come here, my prize.', 'Puppy: Roped, wrapped, bonked... and kept.', 'Bunny: Won the trophy. The Puppy was a bonus.',
    "Bunny: Who's a good boy? ...Fine. You. Today.", 'Puppy: Best loser! Does that mean I can go?', 'Bunny: Go? Oh, Puppy. Cute.',
    'Everyone: Get a room, you two!',
    'Bunny: Hold still. The champion gets one kiss.'], // sweet-ish
  // the couch girls reacting on the Champion stage (little floating words)
  couchFan: ['phew~', 'is it hot in here?', '*fans self*', 'oh my~', 'so bold!'],
  couchRoll: ['ugh, you two', 'get a room!', 'so cute. ew.', '*eye roll*', 'again?!'],
  // ---- Lasso finale: win drag-off (mixed with LINES.lassoOutroBun / lassoOutroPup) ----
  lassoOutroBun: ['Bunny: All tied up and nowhere to go. Perfect.', 'Bunny: Come along, my little prize.', "Bunny: Hush, Puppy. Bunny's driving.",
    'Bunny: Shh. Good boy. You can keep the bow.'], // sweet-ish
  lassoOutroPup: ['Puppy: Gentle with the knots, Bunny!', "Puppy: I'm not complaining. Just saying.", 'Puppy: Where are we going?! ...Snacks?', 'Puppy: Help! ...Not too fast, though.'],
  // ---- Lasso finale: loss card (mixed with LINES.lassoBunLose / lassoPupWin) ----
  lassoBunLose: ['Bunny: Run, Puppy. I love a chase.', "Bunny: Enjoy your freedom. It's temporary.", 'Bunny: Next time, I tie a double knot.', 'Bunny: Slipped my loop? Cute. Again.'],
  lassoPupWin: ['Puppy: Catch me if you can, cowgirl!', 'Puppy: Untied! ...Wait, I kinda liked it.', "Puppy: You'll have to work for it, Bunny!", "Puppy: Free! Nobody look at Bunny's face."],
  // ---- Tail Catch (bonus): Puppy while Bunny leads him off by the tail (mixed with the old inline lines), and his gloat on the loss card ----
  tailOutroPup: ["Puppy: Where are we going? ...I don't mind.", 'Puppy: Gentle! That tail is attached!', 'Puppy: Is this walkies or a kidnapping?', 'Puppy: Lead on, Bunny. I guess.'],
  tailLosePup: ['Puppy: Want my tail? Ask nicely, Bunny.', "Puppy: Tail's still mine! For now!", "Puppy: Chase me again. I'll... go slower.", "Puppy: Wag wag! Can't catch it, can you?"],
  // ---- Noir (Box Bandit) win/lose outro (mixed with LINES.boxWinPup / boxLose) ----
  boxWinPup: ['Puppy: Do NOT deliver me to Bunny!', 'Puppy: Unwrap me? No! FREE me!', 'Puppy: Fragile! Handle with less rope!', "Puppy: Gift-wrapped?! Who's the gift for?!"],
  boxLose: ["Puppy: Found the kitty! Bunny's spy is caught!", "Puppy: Woof! Can't box this Puppy!", 'Puppy: Found you! Bunny next. Hehe.'],
  // ---- Glassia (Penalty Pup) loss card: Puppy's line (mixed with LINES.penLosePup) ----
  penLosePup: ['Puppy: Nothing gets past me. Except Bunny.', 'Puppy: Saved it! Bunny, stop taking notes!', "Puppy: I'm a keeper! Not KEPT. Big difference."],
};
/** One of Marc's pools + its cheeky add-on (the shared no-repeat bag remembers the combined pool by its contents). */
export function mix<T>(...pools: (readonly T[] | undefined)[]): T[] { return pools.flatMap(p => (p ?? []) as T[]); }
// ================= end cheeky Bunny & Puppy =================
