Welcome to Thunder!
===================

Thunder is a JavaScript library that aims to make it easy to create and play sounds in your browser.  Here are some examples of what you can do:

    //create waves using simple math
    var sineFunc(pos, len, freq) { 
    return Math.floor( Th.getMaxSample() * Math.sin( 2.0 * Math.PI * freq * pos /  Th.D_SAMPLE_RATE) );
    };
    Th.Sound.create( "A440Sine", sineFunc );
    
    //play the sounds you've created
    Th.Sound.get( "A440Sine" ).play();
    
    //create and play instruments based on the same math
    var sineInst=Th.Inst.create( "SimpleSine", sineFunc );
    sineInst.getSound( "A" ).play();
    sineInst.getSound( "B" ).play( 1 );    
    sineInst.getSound( "C2" ).play( 2 );        
    
    //play songs using RTTL
    var score="close encounters: d=4,o=3,b=120: d, e, c, p, c2., p, 2g2";
    Th.Sequence.create("CE Sine","SimpleSine",score).play();

Browser Support
---------------

Currently Thunder will work in any browser that supports the &lt;audio&gt; tag with uri data for the source and the .wav file format.  Right now this means at least these browsers will work:

* Chrome 12
* Firefox 4
* Safari 5 on Mac OSX
* Opera 11

Known _not_ working browsers:

* IE 9 and less
* Safari on iOS (iPhones and iPads)

Other browsers may or may not work, I don't know.  But I'd love any help getting certain browsers to work!


Thunder API
===========

Thus begins the documentation.
_Note 1: All UPPERCASE fields are to be treated as constants -- that is, do not try to modify them!_
_Note 2: The `D_` prefix is intended to mean "Default".  Eventually, there may be ways to change all or most of them._

Standard argument values
------------------------
Some of the below functions have arguments which will be found all over.  Here is how you can interpret them

* *id*     : The id specified when the `create()` function was called for the object you would like to retrieve.
* *duration* : Either a ThDuration created by `Th.normalizeDuration()` or a number specifying the number of beats in the current tempo.
* *freq*   : A number reprezenting a Hz frequency, such as 440.
* *note*   : A string specifying a note in normal form such as "A", "Bb", "C#".
* *pitch*  : Generally can be either a frequency (if a number) or a note (if a string).


*Th* : The root of Thunder
--------------------------
All Thunder functionality is reached through the Th namespace.  First, there are a number of constants, for example Th.D_TEMPO:

* *D_CHANNEL_COUNT*   : The default number of channels (2)
* *D_SAMPLE_RATE*     : The default number of samples per second (44100)
* *D_BITS_PER_SAMPLE* : The default number of bits per sample (16)
* *D_TEMPO*           : The default tempo in beats per minute (100)
* *D_A4FREQ*          : The default frequency of A4 (440)
* *D_MIN_OCTAVE*      : The default minimum octave (0)
* *D_MAX_OCTAVE*      : The default maximum octave (10)
* *D_CENTER_OCTAVE*   : The default center octave (4)
* *D_HALF_STEP_UP*    : The default ratio of frequency of a note to the note one half step lower 
* *D_HALF_STEP_DOWN*  : The default ratio of frequency of a note to the note one half step higher 
* *D_MAX_SAMPLE_16*   : The default maximum sample value for 16 bit sound (32767)

Thunder must be initialized with the "init" function, which takes an options argument:

* *init([options])*    : Initializes Thunder setup.  This must be called before anything else.

Options is an optional javascript object containing one or more of the following properties:

* *tempo*        : Beats per minute as a number 
* *beatSamples*  : The number of samples (as in wave samples) per beat.  If present, it will override any tempo supplied.
* *a4Freq*       : The frequency (in Hz) of the A4 note 
* *channelCount* : The number of channels (either 1 or 2) 

For example:

    Th.init({temp:95});

Finally, there are some other functions which can be used to get basic information about the currently initialized Thunder:

* *getMaxSample() number*      : Returns the maximum sample value
* *getTempo() number*          : Returns the tempo of Thunder
* *getBeatLength() number*     : Returns the length of Thunder as a ThDuration
* *getAFrequency() number*     : Returns the current frequency of A4
* *getChannelCount() number*   : Returns the number of channels currently being used (1 or 2).
* *getFrequencyForNote(note) number* : Returns the frequency (in Hz) of a given note.  E.g. `Th.getFrequencyForNote("A4")` will return 440.</span>
* *getNoteForFrequency(freq) string* : Returns the note for a given frequency, if the frequency is within 0.5 of the "correct" value.  So `Th.getNoteForFrequency(439.8)` will return "A4".  The rounding is to allow for handling with compounded rounding issues.  However at high frequencies that may not be enough, and a better algorithm may end up being needed.
* *getOffsetNote(note,offset) string* : Returns a new note based on the given note and offset.  The offest parameter is a positive or negative number of halfsteps to offset the supplied note.  `Th.offsetNote("A4",-5)` will return "E3".
* *normalizeDuration(duration) ThDuration* : Returns a normalized version of duration.  The argument is a string which can be various forms of specifying duration.  
If duration is a function, it is called with no arguments, expecting a number to be returned which specifies the number of samples for this duration.  A number followed by a suffix of "m" or "ms" specifies milliseconds, e.g. "100m" means 100 milliseconds.  The suffix "b" means beats, so "2b" would mean two beats in the current tempo.  The suffix "s" means samples, so "431s" means 431 samples.  Finally, if duration is a number, it is assumed to be a number of beat.


*Th.Sound* : The root for ThSound creation and retrieval.
---------------------------------------------------------
Creates and manages all ThSound objects in Thunder.  It has the following functions:

* *get(id) ThSound* : Returns the specified ThSound.
* *create([id,] ch1 [, ch2] [,options]) ThSound* : Returns a ThSound object based on the supplied arguments.

The create function takes up to four arguments:

* *id*      : An optional ThSound identifier.
* *ch1*     : A required channel array or function.  If ch1 is an array, it must be an array of Numbers between positive and negative Th.D_MAX_SAMPLE_16.  These will make up the samples of your ThSound.  If ch1 is a function, it will be passed four arguments described below.
* *ch2*     : An optional second channel array or function.  If not supplied in a two channel context, the left and right channel will be identical.
* *options* : Optional options for the ThSound creation, described below.

If either of the ch1 or ch2 arguments are functions, that function will be called once for each sample value needed for that channel.  This function will be passed five arguments:

* *index*      : The sample position within the sound wave.
* *length*     : The overall number of samples.
* *freq*       : The frequency being used for this sound.
* *channel*    : The current channel number. 1 for left or only and 2 for right.
* *options*    : The options passed to the original sound creation.  Note that you can attach new variables to this object and it will be usable by the next call to the function.

The options argument for the `Th.Sound.create()` function has these properties:

* *duration*  : Either a ThDuration object or the number of beats for the sound.  The default will be one beat.
* *freq*      : The frequency of the sound.  The default will be A4's frequency, 440.
* *...*       : You can pass other values to the channel function via options.


*ThSound* : A ThSound object.
---------------------------
Contains and plays audio.

* *getAudio() Audio*        : Returns a normal HTML5 Audio element which contains the audio for this ThSound.
* *getId() ThSound*         : Returns the id of this ThSound.
* *play([delayDuration])* : Plays the ThSound either right away or after the specified delay.  The delayDuration parameter specifies how long to wait until this ThSound is played.
* *effect(name1 [, opt1] [, name2, opt2] ...) ThSound* : Returns a ThSound that has the nominated effects applied.  The arguments for the effect function are an effect name, followed by the options for that effect, followed by more names and options if you like.  The available effects are described below.

There are several effects available at this time:

* *"speed"*   : Increases or decreases the speed (which changes the length and pitch of the ThSound.  The option for this effect are numbers which specify the degree of speed increase/decrease.  For example, `snd.effect("speed",[.5,1,2])` will cause the sound to start out at half speed, increase to full speed, and then increase to double speed.
* *"pitch"*   : An alternative way of effecting the ThSound's speed, but uses pitches instead of relative speed values.   For example, `snd.effect("pitch","G3")` or `snd.effect("pitch",[440,430])`.  This implies that the ThSound was supplied a correct frequency when it was created.
* *"volume"*  : Increases or decreases the volume of the ThSound.  For example, `snd.effect("volume",{0:0,0.1:2,.7:.5,1.0:0})` would produce a quick attack at double volume and then fade to nothing.
* *"noise"*   : Adds noise to the ThSound in proportion to the option provided.  `snd.effect("noise",0.1)` will add quiet noise to the ThSound.
* *"mix"*     : The option must be another ThSound object or the id of one.  This ThSound is added to the original ThSound to create a new ThSound.
* *"sample"*  : The option must be a function.  This function is passed several arguments including the position within the wave, and the sample value of this ThSound at that point.  The function is expected to return the sample value to be used at that point in the new ThSound.

If the effect used is "sample", the arguments for the function supplied as opt are as follows:

* *sample*     : The sample value at that point in the sound wave.                            
* *index*      : The sample position within the sound wave.
* *length*     : The overall number of samples.
* *channel*    : The current channel number. 1 for left or only and 2 for right.
* *options*    : The options passed to the original sound creation.  Note that you can attach new variables to this object and it will be usable by the next call to the function.


*Th.Inst* : The root for ThInst creation and retrieval.
-------------------------------------------------------
Creates and manages all ThInst objects in Thunder.

* *get(id) ThInst*            : Returns the specified ThInst.
* *create([id,], ch1 [, ch2] [, options ]) ThInst* : Returns a ThInst object based on the supplied arguments.

The create function takes up to four arguments:

* *id*        : An optional ThInst identifier.
* *ch1*       : A required channel function, which will be used to construct the seperate ThSounds that make up this instrument.
* *ch2*       : An optional second channel array or function.  If not supplied in a two channel context, the left and right channel will be identical.
* *options*   : Optional options for the ThInst creation, passed along to the ThSounds created internally.


*ThInst* : A ThInst object.
-------------------------
Creates and manages a Thunder Instrument, which contain related ThSounds with differing pitches, volumes, and other attributes.

* *getSound(pitch [, opt]) ThSounds* : Returns a ThSound object with the specified pitch and optional settings.
* *getId() ThInst*                   : Returns the id of this ThInst.
        
*Th.Sequence* : The root for ThSequence creation and retrieval.
---------------------------------------------------------------
Creates and manages all ThSequence objects in Thunder.

* *get(id) ThSequence*        : Returns the specified ThSequence.
* *create([id] , inst, [, notation] [, options ]) ThSequence* : Returns a ThSequence object based on the supplied arguments.

The create function takes up to four arguments:

* *id*                : An optional ThSequence identifier.
* *inst*              : A required ThInst object or id, or array of ThInst objects or ids, which is used to play the notation provided.
* *notation*          : A string containing RTTL (http://en.wikipedia.org/wiki/Ring_Tone_Transfer_Language) based music notation, with some additional capabilities described in the Thunder RTTL+ section.
* *options*           : Optional options for the ThSequence creation, passed along to any ThSounds created internally.


*ThSequence* : A ThSequence object.
----------------------------------
Creates and manages a sequence of ThSounds.

* *getName() string* : Returns the name from the sequence notation.
* *getId() string*   : Returns the id of this ThSequence.
* *play()*           : Plays the ThSequence.        


*Thunder's RTTL+* : A string specifying RTTL with some extra capabilities.
--------------------------------------------------------------------------
The string may begin with a name followed by a colon.  For example, "Rock and roll: " would mean the sequence name is "Rock and roll".
The next portion is header portion ending in a colon.  The header contains a comma seperated list of key/value pairs, each seperated by an equal sign.  The keys that are allowed for the header are as follows:

* *D*      : The default note duration.
* *O*      : The default octave.
* *B*      : The tempo, as beats per minute.
* *L*      : How many times to loop (repeat).

So if the header says "D=2, O=4, B=120, L=4: ", then this sequence will have a default not duration of a half note, will default to the fourth octave, will have a tempo of 120 beats per minute, and will repeat 4 times.

The rest of the string contains a comma/space seperated list of notes, chords, or controls.  Notes must start with a duration, followed by a music note specification, followed by an optional period, followed by the octave.  If the duration or octave are left off, the default applies.  For example "4d#5" will play a D sharp quarter note in the fifth octave.  The music note must begin with a letter A through G, and can be followed by a # or b to sharp or flat the note.  A note of "P" can be used for a pause.  Adding the period means it is a dotted note, and the duration is 1.5 times longer than otherwise specified, for example a "2B.2" would play a B in the second octave for 3 beats.

Chords are specified by surrounding a note with parenthesis with an optional suffix, or surrounding a of notes with parenthesis.  So "(G)" or "(Gj)" means to play a G major chord, whereas "(Gm)" will play a G minor chord.  Sets of notes like "(C Eb G Bb)" can be used to specify more complex chords (in this case Cm7).  The chord can be preceded by a duration and followed by an octave as with notes, for example "8(B#)2" would play a B sharp chord in the second octave for an eigth note.

Controls are one of the following keys combined with a number:

* *K*      : Backtrack by the speficied number of beats, e.g. "4K" will reckon the next position to be a quarter note earlier.
* *R*      : Realign to the next beat point for the specified duration.  "2R" will reckon the next position to be aligned to an even half note.
* *I*      : Changes which instrument to use. "I1" would give you the second instrument spefied in the ThSequence constructor.
