---
title: Understanding Perlin Noise
visible: false
---

The objective of this article is to present an easy-to-understand analysis of Ken Perlin\'s [Improved Perlin Noise](http://mrl.nyu.edu/~perlin/noise/).  The code in this article is written in C# and is free to use.  If you would prefer to just look at the final result, [you can view the final source here](https://gist.github.com/Flafla2/f0260a861be0ebdeef76).

Perlin Noise is an extremely powerful algorithm that is used often in procedural content generation.  It is especially useful for games and other visual media such as movies.  The man who created it, Ken Perlin, [won an academy award for the original implementation](http://mrl.nyu.edu/~perlin/doc/oscar.html).  In this article I will be exploring his [Improved Perlin Noise](http://mrl.nyu.edu/~perlin/noise/), released in 2002.

In game development, Perlin Noise can be used for any sort of wave-like, undulating material or texture.  For example, it could be used for procedural terrain (*Minecraft*, for example uses Perlin Noise for its terrain generation), fire effects, water, and clouds.  These effects mostly represent Perlin noise in the 2<sup>nd</sup> and 3<sup>rd</sup> dimensions, but it can be extended into the 4<sup>th</sup> dimension rather trivially.  Additionally Perlin Noise can be used in only 1 dimension for purposes such as side-scrolling terrain(such as in *Terraria* or *Starbound*) or to create the illusion of handwritten lines.

Also, if you extend Perlin Noise into an additional dimension and consider the extra dimension as time, you can animate Perlin Noise.  For example, 2D perlin noise can be interpreted as Terrain, but 3D perlin noise can similarly be interpreted as undulating waves in an ocean scene.  Below are some pictures of Noise in different dimensions and some of their uses at runtime:

<table style="text-align: center">
	<tr>
		<th style="width: 10%">Noise Dimension</th>
		<th style="width: 40%">Raw Noise (Grayscale)</th>
		<th style="width: 50%">Use Case</th>
	</tr>
	<tr>
		<td>1</td>
		<td><img src="/img/2014-08-02-perlinnoise/raw1d.png" style="width: 100%; max-width: 150px;" /></td>
		<td style="font-size: 0.7em"><img src="/img/2014-08-02-perlinnoise/use1d.png" style="width: 100%; max-width: 150px;" /><br />Using noise as an offset to create handwritten lines.</td>
	</tr>
	<tr>
		<td>2</td>
		<td><img src="/img/2014-08-02-perlinnoise/raw2d.png" style="width: 100%; max-width: 150px;" /></td>
		<td style="font-size: 0.7em"><img src="/img/2014-08-02-perlinnoise/use2d.png" style="width: 100%; max-width: 150px;" /><br />By applying a simple gradient, a procedural fire texture can be created.</td>
	</tr>
	<tr>
		<td>3</td>
		<td><img src="/img/2014-08-02-perlinnoise/raw3d.png" style="width: 100%; max-width: 150px;" /></td>
		<td style="font-size: 0.7em"><img src="/img/2014-08-02-perlinnoise/use3d.png" style="width: 100%; max-width: 150px;" /><br />Perhaps the quintessential use of Perlin noise today, terrain can be created with caves and caverns using a modified Perlin Noise implementation.</td>
	</tr>
</table>

So as you can see, Perlin Noise has an application to many naturally-occurring phoenomenon.  Now let\'s look into the mathematics and logic of the Perlin Noise Algorithm.

Logical Overview
----------------

*NOTE: I would like to preface this section by mentioning that a lot of it is taken from [this wonderful article by Matt Zucker](http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html).  However, that article is based on the original Perlin Noise algorithm written in the early 1980s.  In this post I will be using the Improved Perlin Noise Algorithm written in 2002.  Thus, there are some key differences between my version and Zucker\'s.*

Let\'s start off with the basic perlin noise function:

{% highlight csharp %}
public double perlin(double x, double y, double z);
{% endhighlight %}

So we have an x, y and z coordinate as input, and as the output we get a <code>double</code> between 0.0 and 1.0.  So what do we do with this input?  First, we divide the x, y, and z coordinates into unit cubes.  In other words, find <code>[x,y,z] % 1.0</code> to find the coordinate's location within the cube.  Below is a representation of this concept in 2 dimensions:

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/logic01.png" style="text-align: center; width: 100%; max-width: 148px;" /><br />
	<i>Figure 1: The blue dot here represents an input coordinate, and the other 4 points are the surrounding integral unit coordinates.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

On each of the 4 unit coordinates (8 in 3D), we generate what\'s called a *pseudorandom gradient vector*.  This gradient vector defines a "positive" direction (in the direction that it points to) and of course a negative direction (in the direction opposite that it points to).  *Pseudorandom* means that, for any set of integers inputted into the gradient vector equation, the same result will always come out.  Thus, it seems random, but it isn\'t in reality.  Additionally this means that each integral coordinate has its \"own\" gradient that will never change if the gradient function doesn\'t change.

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/logic02.png" style="text-align: center; width: 100%; max-width: 246px;" /><br />
	<i>Figure 2: Based on the above image, here are some example gradient vectors.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

The image above is not completely accurate, however.  In Ken Perlin\'s *Improved Noise*, which we are using in this article, these gradients aren\'t completely random.  Instead, they are picked from the vectors of the point in the center of a cube to the edges of the cube:

{% highlight csharp %}
(1,1,0),(-1,1,0),(1,-1,0),(-1,-1,0),
(1,0,1),(-1,0,1),(1,0,-1),(-1,0,-1),
(0,1,1),(0,-1,1),(0,1,-1),(0,-1,-1)
{% endhighlight %}

The reasoning behind these specific gradient vectors is described in [Ken Perlin\'s SIGGRAPH 2002 article: *Improving Noise*](http://mrl.nyu.edu/~perlin/paper445.pdf).  *NOTE: Many other articles about Perlin Noise refer to the original Perlin Noise algorithm, which does not use these vectors.  For example, Figure 2 represents the original algorithm because its source was written before the improved algorithm was released.  However, the basic idea is the same.*

Next, we need to calculate the 4 vectors (6 in 3D) from the given point to the 6 surrounding points on the grid.  An example case of this in 2D is shown below.

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/logic03.png" style="text-align: center; width: 100%; max-width: 191px;" /><br />
	<i>Figure 3: Example distance vectors.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

Next, we take the dot product between the two vectors (the gradient vector and the distance vector).  This gives us our final *influence* values:

{% highlight csharp %}
grad.x * dist.x + grad.y * dist.y + grad.z * dist.z
{% endhighlight %}

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/logic04.png" style="text-align: center; width: 100%; max-width: 141px;" /><br />
	<i>Figure 4: A representation of these influences in 2D noise.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

So now all we need to do is interpolate between these 4 values so that we get a sort of weighted average in between the 4 grid points (8 in 3D).  The solution to this is easy: average the averages like so (this example is in 2D):

{% highlight csharp %}
// Below are 4 influence values in the arrangement:
// [g1] | [g2]
// -----------
// [g3] | [g4]
int g1, g2, g3, g4;
int u, v;	// These coordinates are the location of the input coordinate in its unit square.  
			// For example a value of (0.5,0.5) is in the exact center of its unit square.

int x1 = lerp(g1,g2,u);
int x2 = lerp(g3,h4,u);

int average = lerp(x1,x2,v);
{% endhighlight %}

There is one final piece to this puzzle: with the above weighted average, the final result would look bad because linear interpolation, while computationally cheap, looks unnatural.  We need a smoother transition between gradients.  So, we use a *fade function*, also called an *ease curve*:

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/logic05.png" style="text-align: center; width: 100%; max-width: 108px;" /><br />
	<i>Figure 5: This is an ease curve.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

This ease curve is applied to the <code>u</code> and <code>v</code> values in the above code example.  This makes changes more gradual as one approaches integral coorinates.  The fade function for the improved perlin noise implementation is this:

<p style="text-align: center">6<i>t</i><sup>5</sup>-5<i>t</i><sup>4</sup>+10<i>t</i><sup>3</sup></p>

Logically, that\'s it!  We now have all of the components needed to generate Perlin Noise.  Now let\'s jump into some code.

Code Implementation
-------------------

Once again, this code is written in C#.  The code is a slightly modified version of [Ken Perlin\'s Java Implementation](http://mrl.nyu.edu/~perlin/noise/).  It was modified for additional clarity and deobfuscation, as well as adding the ability to repeat (tile) noise.  The code is of course entirely free to use (considering I didn\'t really write it in the first place - Ken Perlin did!).

###Setting Up

The first thing we need to do is set up our permutation table, or the <code>p[]</code> array for short.  This is simply a length 256 array of random values from 1 - 255 inclusive.  We also repeat this array (for a total size of 512) to avoid buffer overflow later on:

{% highlight csharp %}
private static readonly int[] permutation = { 151,160,137,91,90,15,					// Hash lookup table as defined by Ken Perlin.  This is a randomly
	131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,	// arranged array of all numbers from 0-255 inclusive.
	190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
	88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
	77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
	102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
	135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
	5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
	223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
	129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
	251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
	49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
};

private static readonly int[] p; 													// Doubled permutation to avoid overflow

static Perlin() {
	p = new int[512];
	for(int x=0;x<512;x++) {
		p[x] = permutation[x%256];
	}
}
{% endhighlight %}

The <code>p[]</code> array is used in a hash function that will determine what gradient vector to use later on.  The specifics of this will be explained later.

Next, we begin our perlin noise function:

{% highlight csharp %}
public double perlin(double x, double y, double z) {
	if(repeat > 0) {									// If we have any repeat on, change the coordinates to their "local" repetitions
		x = x%repeat;
		y = y%repeat;
		z = z%repeat;
	}
	
	int xi = (int)x & 255;								// Calculate the "unit cube" that the point asked will be located in
	int yi = (int)y & 255;								// The left bound is ( |_x_|,|_y_|,|_z_| ) and the right bound is that
	int zi = (int)z & 255;								// plus 1.  Next we calculate the location (from 0.0 to 1.0) in that cube.
	double xf = x-(int)x;
	double yf = y-(int)y;
	double zf = z-(int)z;

	// ...
}
{% endhighlight %}

This code is pretty self explanatory.  First, we use the modulo (remainder) operator to have our input coordinates overflow if they are over the <code>repeat</code> variable.  Next, we create variables <code>xi, yi, zi</code>.  These represent the unit cube that our coordinate is in.  We also bind our coordinates to the range [0,255] inclusive so that we won\'t run into overflow errors later on when we access the <code>p[]</code> array.  This also has an unfortunate side effect: Perlin noise always repeats every 256 coordinates.  This isn\'t a problem though because decimal coordinates are possible with perlin noise.  Finally we find the location of our coordinate inside its unit cube.  This is essentially <code>n = n % 1.0</code> where *n* is a coordinate.

###The Fade Function

Now we need to define our fade function, described above (Figure 5).  As mentioned earlier, this is the Perlin Noise fade function:

<p style="text-align: center">6<i>t</i><sup>5</sup>-5<i>t</i><sup>4</sup>+10<i>t</i><sup>3</sup></p>

In code, it is defined like this:

{% highlight csharp %}
public static double fade(double t) {
														// Fade function as defined by Ken Perlin.  This eases coordinate values
														// so that they will ease towards integral values.  This ends up smoothing
														// the final output.
	return t * t * t * (t * (t * 6 - 15) + 10);			// 6t^5 - 15t^4 + 10t^3
}

public double perlin(double x, double y, double z) {
	// ...

	double u = fade(xf);
	double v = fade(yf);
	double w = fade(zf);

	// ...
}
{% endhighlight %}

The <code>u / v / w</code> values will be used later with interpolation.

###The Hash Function

The Perlin Noise hash function is used to get a unique value for every coordinate input.  A *hash function*, as defined by wikipedia, is:

>... any function that can be used to map data of arbitrary size to data of fixed size, with slight differences in input data producing very big differences in output data.

This is the hash function that Perlin Noise uses.  It uses the <code>p[]</code> table that we created earlier:

{% highlight csharp %}
public double perlin(double x, double y, double z) {
	// ...

	int aaa, aba, aab, abb, baa, bba, bab, bbb;
	aaa = p[p[p[    xi ]+    yi ]+    zi ];
	aba = p[p[p[    xi ]+inc(yi)]+    zi ];
	aab = p[p[p[    xi ]+    yi ]+inc(zi)];
	abb = p[p[p[    xi ]+inc(yi)]+inc(zi)];
	baa = p[p[p[inc(xi)]+    yi ]+    zi ];
	bba = p[p[p[inc(xi)]+inc(yi)]+    zi ];
	bab = p[p[p[inc(xi)]+    yi ]+inc(zi)];
	bbb = p[p[p[inc(xi)]+inc(yi)]+inc(zi)];

	// ...
}

public int inc(int num) {
	num++;
	if (repeat > 0) num %= repeat;
	
	return num;
}
{% endhighlight %}

The above hash function hashes all 8 unit cube coordinates surrounding the input coordinate.  <code>inc()</code> is simply used to increment the numbers and make sure that the noise still repeats.  If you didn't care about the ability to repeat, <code>inc(xi)</code> can be replaced by <code>xi+1</code>.  The result of this hash function is a value between 0 and 255 (inclusive) because of our <code>p[]</code> array.

###The Gradient Function

I have always thought that Ken Perlin\'s original <code>grad()</code> function is needlessly complicated and confusing.  Remember, the goal of <code>grad()</code> is to calculate the dot product of a randomly selected gradient vector and the 8 location vectors.  Ken Perlin used some fancy bit-flipping code to accomplish this:

{% highlight csharp %}
public static double grad(int hash, double x, double y, double z) {
	int h = hash & 15;									// Take the hashed value and take the first 4 bits of it (15 == 0b1111)
	double u = h < 8 /* 0b1000 */ ? x : y;				// If the most signifigant bit (MSB) of the hash is 0 then set u = x.  Otherwise y.
	
	double v;											// In Ken Perlin's original implementation this was another conditional operator (?:).  I
														// expanded it for readability.
	
	if(h < 4 /* 0b0100 */)								// If the first and second signifigant bits are 0 set v = y
		v = y;
	else if(h == 12 /* 0b1100 */ || h == 14 /* 0b1110*/)// If the first and second signifigant bits are 1 set v = x
		v = x;
	else 												// If the first and second signifigant bits are not equal (0/1, 1/0) set v = z
		v = z;
	
	return ((h&1) == 0 ? u : -u)+((h&2) == 0 ? v : -v); // Use the last 2 bits to decide if u and v are positive or negative.  Then return their addition.
}
{% endhighlight %}

Below is an alternate way of writing the above code in a much more easy-to-understand way (and actually faster in many languages):

{% highlight csharp %}
// Source: http://riven8192.blogspot.com/2010/08/calculate-perlinnoise-twice-as-fast.html
public static double grad(int hash, double x, double y, double z)
{
	switch(hash & 0xF)
	{
		case 0x0: return  x + y;
		case 0x1: return -x + y;
		case 0x2: return  x - y;
		case 0x3: return -x - y;
		case 0x4: return  x + z;
		case 0x5: return -x + z;
		case 0x6: return  x - z;
		case 0x7: return -x - z;
		case 0x8: return  y + z;
		case 0x9: return -y + z;
		case 0xA: return  y - z;
		case 0xB: return -y - z;
		case 0xC: return  y + x;
		case 0xD: return -y + z;
		case 0xE: return  y - x;
		case 0xF: return -y - z;
		default: return 0; // never happens
	}
}
{% endhighlight %}

In any case, both versions do the same thing.  They pick a random vector from the following 12 vectors:

{% highlight csharp %}
(1,1,0),(-1,1,0),(1,-1,0),(-1,-1,0),
(1,0,1),(-1,0,1),(1,0,-1),(-1,0,-1),
(0,1,1),(0,-1,1),(0,1,-1),(0,-1,-1)
{% endhighlight %}

This is determined by the last 4 bits of the hash function value (the first parameter of <code>grad()</code>).  The other 3 parameters represent the location vector (that will be used for the dot product).

###Putting it all Together

Now, we use take all of these functions, use them for all 8 surrounding unit cube coordinates, and interpolate them together:

{% highlight csharp %}
public double perlin(double x, double y, double z) {
	// ...

	double x1, x2, y1, y2;
	x1 = lerp(	grad (aaa, xf  , yf  , zf),				// The gradient function calculates the dot product between a pseudorandom
				grad (baa, xf-1, yf  , zf),				// gradient vector and the vector from the input coordinate to the 8
				u);										// surrounding points in its unit cube.
	x2 = lerp(	grad (aba, xf  , yf-1, zf),				// This is all then lerped together as a sort of weighted average based on the faded (u,v,w)
				grad (bba, xf-1, yf-1, zf),				// values we made earlier.
		          u);
	y1 = lerp(x1, x2, v);

	x1 = lerp(	grad (aab, xf  , yf  , zf-1),
				grad (bab, xf-1, yf  , zf-1),
				u);
	x2 = lerp(	grad (abb, xf  , yf-1, zf-1),
	          	grad (bbb, xf-1, yf-1, zf-1),
	          	u);
	y2 = lerp (x1, x2, v);
	
	return (lerp (y1, y2, w)+1)/2;						// For convenience we bind the result to 0 - 1 (theoretical min/max before is [-1, 1])
}

// Linear Interpolate
public static double lerp(double a, double b, double x) {
	return a + x * (b - a);
}
{% endhighlight %}

Working with Octaves
--------------------

One final thing I would like to discuss is how to process perlin noise to look more natural.  Even though perlin noise does provide a certain degree of natural behavior, it doesn't fully express the irregularities that one might expect in nature.  For example, a terrain has large, sweeping features such as mountains, smaller features such as hills and depressions, even smaller ones such as boulders and large rocks, and very small ones like pebbles and minute differences in the terrain.  The solution to this is simple: you take multiple noise functions with varying frequencies and amplitudes, and add them together.  Of course, *frequency* refers to the period at which data is sampled, and *amplitude* refers to the range at which the result can be in.

<p style="text-align: center">
	<img src="/img/2014-08-02-perlinnoise/octave01.png" style="text-align: center; width: 100%; max-width: 768px;" /><br />
	<i>Figure 6: 6 Example noise results with differing frequencies and amplitudes.</i> (<a href="http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html">Source</a>)
</p>

Conclusion
----------

Finally, that\'s it!  We can now make noise.  [Once again, you can find the full source code here.](https://gist.github.com/Flafla2/f0260a861be0ebdeef76).  If you have any questions, please ask in the comments section below.  Thank you for reading!  