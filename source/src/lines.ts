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
