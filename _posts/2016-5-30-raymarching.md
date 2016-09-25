---
title: Raymarching Distance Fields&#58; Concepts and Implementation in Unity
tag: tech_writeup
---

*Raymarching* is a fairly new technique used to render realtime scenes.  The technique is particularly interesting because it is entirely computed in a screen-space shader.  In other words, no mesh data is provided to the renderer and the scene is drawn on a single quad that covers the camera's field of vision.  Objects in the scene are defined by an analytic equation that describes the shortest distance between a point and the surface of any object in the scene (hence the full name *Raymarching Distance Fields*).  It turns out that with only this information you can compose some strikingly complicated and beautiful scenes.  Further, because you aren't using polygonal meshes (and are instead using mathematical equations) it is possible to define perfectly smooth surfaces, unlike in a traditional renderer.

<p style="text-align: center">
    <img src="/img/2016-5-30-raymarching/snail.png" style="text-align: center; width: 100%; max-width: 350px;" /><br />
    <i><a href="https://www.shadertoy.com/view/ld3Gz2">Snail</a> by Inigo Quilez was created entirely using raymarching.  You can find more examples of raymarched scenes on <a href="https://www.shadertoy.com">Shadertoy</a>.</i>
</p>

This article will first discuss the fundamental concepts and theory of raymarching.  Then it will show how to implement a basic raymarcher in the Unity game engine.  Finally it will show how to integrate raymarching practically in a real Unity game by allowing raymarched objects to be occluded by normal Unity GameObjects.
<!--break-->

## Introduction to Raymarching

Raymarching is similar to traditional raytracing in that a ray is cast into the scene for each pixel.  In a raytracer, you are given a set of equations that determines the intersection of a ray and the objects you are rendering.  This way it is possible to get a fully accurate representation of what objects the ray intersects (that is, the objects that the camera sees).  It is also possible to render nonpolygonal objects such as spheres because you only need to know the sphere / ray intersection formula (for example).  However, raytracing is very expensive, especially when you have many objects and complex lighting.  Additionally you can not raytrace through a volumetric material, such as clouds or water.  Therefore raytracing is largely inadequate for realtime applications.

<p style="text-align: center">
    <img src="/img/2016-5-30-raymarching/figure1.png" style="text-align: center; width: 100%; max-width: 450px;" /><br />
    <i>Figure 1: Simplified representation of a raytracer.  The thick black line is an example ray cast to render a pixel from the camera.</i>
</p>

Raymarching takes an alternative approach to the ray / object intersection problem.  Raymarching does not try to directly calculate this intersection analytically.  Instead, **in raymarching we "march" a point along the ray until we find that the point intersects an object**.  It turns out that sampling this point along the ray is a relatively simple and inexpensive operation, and much more practical in realtime.  As you can see in figure 2, this method is less accurate than raytracing (if you look closely the intersection point is slightly off).  For games however it is more than adequate, and is a great compromise between the efficiency of polygonal rendering and the accuracy of traditional raytracing.

<p style="text-align: center">
    <img src="/img/2016-5-30-raymarching/figure2.png" style="text-align: center; width: 100%; max-width: 450px;" /><br />
    <i>Figure 2: Basic implementation of a raymarcher with a fixed marching interval.  The red dots represent each sample point.</i>
</p>

### Enter distance fields

A *fixed interval* raymarcher (that is, the a raymarcher where the distance between each sample along the ray is the same) is sufficient for many applications such as volumetric or transparent surfaces.  However, for opaque objects we can introduce another optimization.  This optimization calls for the use of *signed distance fields*.  **A *distance field* is a function that takes in a point as input and returns the shortest distance from that point to the surface any object in the scene.**  A *signed* distance field additionally returns a negative number if the input point is inside of an object.  Distance fields are great because they allow us to limit how often we need to sample when marching along the ray.  See the example below:

<p style="text-align: center">
    <img src="/img/2016-5-30-raymarching/figure3.png" style="text-align: center; width: 100%; max-width: 450px;" /><br />
    <i>Figure 3: Visualization of a raymarcher using signed distance fields.  The red dots represent each sample point.  Each blue circle represents the area that is guaranteed to not contain any objects (because they are within the results of the distance field).  The dashed green lines represent the true shortest vector between each sample point and the scene.</i>
</p>

As you can see above, the distance field allows us to march the ray by a maximal distance each step.

## Implementing a Basic Raymarcher

Because the raymarching algorithm is run on every pixel, a raymarcher in Unity is essentially a post processing shader.  Because of this, much of the C# code that we will write is similar to what you would use for a full-screen image effect.

### Setting up the Image Effect Script

Let's implement a basic image effect loading script.  A quick note: I am using the [SceneViewFilter](http://framebunker.com/blog/viewing-image-effects-in-the-scene-view/) script to automatically apply image filters to the scene view.  This allows you to debug your shader more easily.  To use it, simply extend ``SceneViewFilter`` instead of ``MonoBehaviour`` in your image effect script.

Just to get the boilerplate code out of the way, a basic image effect script is shown below:

{% highlight csharp linenos %}
using UnityEngine;
using System.Collections;

[ExecuteInEditMode]
[RequireComponent(typeof(Camera))]
[AddComponentMenu("Effects/Raymarch (Generic)")]
public class TutorialRaymarch : SceneViewFilter {

    [SerializeField]
    private Shader _EffectShader;

    public Material EffectMaterial
    {
        get
        {
            if (!_EffectMaterial && _EffectShader)
            {
                _EffectMaterial = new Material(_EffectShader);
                _EffectMaterial.hideFlags = HideFlags.HideAndDontSave;
            }

            return _EffectMaterial;
        }
    }
    private Material _EffectMaterial;

    public Camera CurrentCamera
    {
        get
        {
            if (!_CurrentCamera)
                _CurrentCamera = GetComponent<Camera>();
            return _CurrentCamera;
        }
    }
    private Camera _CurrentCamera;

    [ImageEffectOpaque]
    void OnRenderImage(RenderTexture source, RenderTexture destination)
    {
        if (!EffectMaterial)
        {
            Graphics.Blit(source, destination); // do nothing
            return;
        }

        Graphics.Blit(source, destination, EffectMaterial, 0); // use given effect shader as image effect
    }
}
{% endhighlight %}

To use this script, attach it to a camera and drag an image effect shader onto the "Effect Shader" field.  As a test, you can try the default image effect shader (Assets > Create > Shader > Image Effects Shader), which simply inverts the screen.  With that out of the way, we can begin to get into the more technical aspects of the implementation.

### Passing Rays to the Fragment Shader

The first step in actually implementing a raymarcher is to calculate the ray that we will be using for each pixel.  We also want these rays to match up with the Unity render settings (such as the camera's postion, rotation, FOV, etc).

<p style="text-align: center">
    <img src="/img/2016-5-30-raymarching/figure4.png" style="width: 100%; max-width: 300px;" /><br />
    <i>Figure 4: A visualization of the rays sent out from the camera</i>
</p>

There are many ways of doing this, but I have chosen to use the following procedure every frame:

1. Compute an array of four vectors that make up [Camera View Frustum](https://docs.unity3d.com/Manual/UnderstandingFrustum.html).  These four vectors can be thought of as the "corners" of the view frustum:
    <p style="text-align: center">
      <img src="/img/2016-5-30-raymarching/viewfrustum.png" style="width: 100%; max-width: 300px;" /><br />
      <i>The four view frustum corners that are later passed to the shader</i>
    </p>
2. When rendering our raymarcher as an image effect shader, use our own custom replacement for [Graphics.Blit()](https://docs.unity3d.com/ScriptReference/Graphics.Blit.html).  Graphics.Blit essentially renders a quad over the entire screen, and this quad renders with the image effect shader.  We will add to this by, for each vertex, *passing the corresponding indices in the array we created in step 1*.  Now, the vertex shader is aware of the rays to cast at each corner of the screen!
3. In the shader, pass the ray directions from step 2 into the fragment shader.  Cg will automatically interpolate the ray directions for each pixel, giving the true ray direction.

Okay, now let's implement the above process.

#### Step 1: Computing the View Frustum corners

To calculate the camera frustum corner rays, you have to take into account the field of view of the camera as well as the camera's aspect ratio.  I have done this in the function ``GetFrustumCorners`` below:

{% highlight csharp linenos %}
/// \brief Stores the normalized rays representing the camera frustum in a 4x4 matrix.  Each row is a vector.
/// 
/// The following rays are stored in each row (in eyespace, not worldspace):
/// Top Left corner:     row=0
/// Top Right corner:    row=1
/// Bottom Right corner: row=2
/// Bottom Left corner:  row=3
private Matrix4x4 GetFrustumCorners(Camera cam)
{
    float camFov = cam.fieldOfView;
    float camAspect = cam.aspect;

    Matrix4x4 frustumCorners = Matrix4x4.identity;

    float fovWHalf = camFov * 0.5f;

    float tan_fov = Mathf.Tan(fovWHalf * Mathf.Deg2Rad);

    Vector3 toRight = Vector3.right * tan_fov * camAspect;
    Vector3 toTop = Vector3.up * tan_fov;

    Vector3 topLeft = (-Vector3.forward - toRight + toTop);
    Vector3 topRight = (-Vector3.forward + toRight + toTop);
    Vector3 bottomRight = (-Vector3.forward + toRight - toTop);
    Vector3 bottomLeft = (-Vector3.forward - toRight - toTop);

    frustumCorners.SetRow(0, topLeft);
    frustumCorners.SetRow(1, topRight);
    frustumCorners.SetRow(2, bottomRight);
    frustumCorners.SetRow(3, bottomLeft);

    return frustumCorners;
}
{% endhighlight %}

It's worth noting a couple of things about this function.  First, it returns a ``Matrix4x4`` instead of an array of Vector3's.  This way, we can pass the vectors to our shader with a single variable (without having to use arrays).  Second, it returns the frustum corner rays in *eye space*.  This means that (0,0,0) is assumed to be the camera's position, and the rays themselves are from the Camera's point of view (instead of, for example, worldspace).

#### Step 2: Passing the Rays to the GPU

To pass this matrix to the shader, we need to make a slight modification to our Image Effect Script:

{% highlight csharp lineno %}
[ImageEffectOpaque]
void OnRenderImage(RenderTexture source, RenderTexture destination)
{
    if (!EffectMaterial)
    {
        Graphics.Blit(source, destination); // do nothing
        return;
    }

    // pass frustum rays to shader
    EffectMaterial.SetMatrix("_FrustumCornersES", GetFrustumCorners(CurrentCamera));
    EffectMaterial.SetMatrix("_CameraInvViewMatrix", CurrentCamera.cameraToWorldMatrix);
    EffectMaterial.SetVector("_CameraWS", CurrentCamera.transform.position);

    Graphics.Blit(source, destination, EffectMaterial, 0); // use given effect shader as image effect
}
{% endhighlight %}

Later, when we work on the image effect shader itself, we can access this matrix using the uniform ``_FrustumCornersES``.  I also threw in some camera-related information that we will need later (``_CameraInvViewMatrix`` will be used to convert the rays from eye space to world space, and ``_CameraWS`` is the camera's position).

Next up, we need to give the vertex shader the tools to interpret this matrix correctly.  Remember: an image effect is simply a quad drawn over the entire screen, so we need to somehow pass the corresponding index of ``_FrustumCornersES`` to each vertex in the vertex shader.  To do this, we need to use our own custom replacement to ``Graphics.Blit`` (line 13 above).  In this custom version, we will use a sneaky trick: because the quad in ``Graphics.Blit`` is drawn using [Orthographic Projection](http://blender.stackexchange.com/questions/648/what-are-the-differences-between-orthographic-and-perspective-views), the ``z`` position of each vertex doesn't affect the final image.  So, we can simply pass the corresponding indices of ``_FrustumCornersES`` through the ``z`` coordinate of each vertex!  This sounds complicated, but is quite simple in practice:

{% highlight csharp linenos %}
/// \brief Custom version of Graphics.Blit that encodes frustum corner indices into the input vertices.
/// 
/// In a shader you can expect the following frustum cornder index information to get passed to the z coordinate:
/// Top Left vertex:     z=0, u=0, v=0
/// Top Right vertex:    z=1, u=1, v=0
/// Bottom Right vertex: z=2, u=1, v=1
/// Bottom Left vertex:  z=3, u=1, v=0
/// 
/// \warning You may need to account for flipped UVs on DirectX machines due to differing UV semantics
///          between OpenGL and DirectX.  Use the shader define UNITY_UV_STARTS_AT_TOP to account for this.
static void CustomGraphicsBlit(RenderTexture source, RenderTexture dest, Material fxMaterial, int passNr)
{
    RenderTexture.active = dest;

    fxMaterial.SetTexture("_MainTex", source);

    GL.PushMatrix();
    GL.LoadOrtho(); // Note: z value of vertices don't make a difference because we are using ortho projection

    fxMaterial.SetPass(passNr);

    GL.Begin(GL.QUADS);

    // Here, GL.MultitexCoord2(0, x, y) assigns the value (x, y) to the TEXCOORD0 slot in the shader.
    // GL.Vertex3(x,y,z) queues up a vertex at position (x, y, z) to be drawn.  Note that we are storing
    // our own custom frustum information in the z coordinate.
    GL.MultiTexCoord2(0, 0.0f, 0.0f);
    GL.Vertex3(0.0f, 0.0f, 3.0f); // BL

    GL.MultiTexCoord2(0, 1.0f, 0.0f);
    GL.Vertex3(1.0f, 0.0f, 2.0f); // BR

    GL.MultiTexCoord2(0, 1.0f, 1.0f);
    GL.Vertex3(1.0f, 1.0f, 1.0f); // TR

    GL.MultiTexCoord2(0, 0.0f, 1.0f);
    GL.Vertex3(0.0f, 1.0f, 0.0f); // TL
    
    GL.End();
    GL.PopMatrix();
}

// ...

void OnRenderImage(RenderTexture source, RenderTexture destination)
{
    // ...
    EffectMaterial.SetMatrix("_FrustumCornersES", GetFrustumCorners(CurrentCamera));

    CustomGraphicsBlit(source, destination, EffectMaterial, 0); // Replace Graphics.Blit with CustomGraphicsBlit
}
{% endhighlight %}

In a normal ``Graphics.Blit`` implementation, the four calls to ``GL.Vertex3`` would all have z coordinates of 0.  However, with this modification, we assign the corresponding indices in ``_FrustumCornersES`` as the z coordinate.

#### Step 3: Receiving the Ray Directions in your Shader

Finally, we are now ready to start writing the raymarching shader.  As a base, I will start with the default image effects shader (Assets > Create > Shader > Image Effects Shader).  First, we need to edit the vertex shader to properly interpret ``_FrustumCornersES``:

{% highlight c linenos %}
// Provided by our script
uniform float4x4 _FrustumCornersES;
uniform sampler2D _MainTex;
uniform float4 _MainTex_TexelSize;
uniform float4x4 _CameraInvViewMatrix;

// Input to vertex shader
struct appdata
{
    // Remember, the z value here contains the index of _FrustumCornersES to use
    float4 vertex : POSITION;
    float2 uv : TEXCOORD0;
};

// Output of vertex shader / input to fragment shader
struct v2f
{
    float4 pos : SV_POSITION;
    float2 uv : TEXCOORD0;
    float3 ray : TEXCOORD1;
};

v2f vert (appdata v)
{
    v2f o;
    
    // Index passed via custom blit function in RaymarchGeneric.cs
    half index = v.vertex.z;
    v.vertex.z = 0.1;
    
    o.pos = mul(UNITY_MATRIX_MVP, v.vertex);
    o.uv = v.uv.xy;
    
    #if UNITY_UV_STARTS_AT_TOP
    if (_MainTex_TexelSize.y < 0)
        o.uv.y = 1 - o.uv.y;
    #endif

    // Get the eyespace view ray (normalized)
    o.ray = _FrustumCornersES[(int)index].xyz;

    // Transform the ray from eyespace to worldspace
    // Note: _CameraInvViewMatrix was provided by the script
    o.ray = mul(_CameraInvViewMatrix, o.ray);
    return o;
}
{% endhighlight %}

Much of the vertex shader so far should be familiar to Unity graphics programmers: as in most image effect shaders we pass the vertex positions and UV data to the fragment shader.  We also need to flip the UVs in the Y axis in some cases [to prevent our output appearing upside-down](https://docs.unity3d.com/Manual/SL-PlatformDifferences.html).  Of course, we also extract the corresponding ray from ``_FrustumCornersES`` that we are interested in, using the Z coordinate of the input vertex (these Z values were injected above in Step 2).  After the vertex shader finishes, the rays are interpolated by the GPU for each pixel.  We can now use these interpolated rays in the fragment shader!

As a test, try simply returning the ray direction in the fragment shader, like so:

{% highlight c linenos %}
fixed4 frag (v2f i) : SV_Target
{
    fixed4 col = fixed4(i.ray, 1);
    return col;
}
{% endhighlight %}

You should see the following visualization back in Unity:

<div style="max-width:500px;display:block;margin:0 auto;">
    <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="SaltyIckyFiddlercrab"></div>
</div>
<p style="text-align: center">
    <i>Visualizing the world-space ray direction of each pixel.  Notice that, for example, when you look up the result is green.  This corresponds to the actual ray direction (0, 1, 0).</i>
</p>

### Building the Distance Field

The next step is to construct the distance field that we are going to use.  As a reminder, the **distance field** defines what you are going to render (as opposed to 3D models/meshes in a traditional renderer).  Your distance field function takes in a point as input, and returns the distance from that point to the surface of the closest object in the scene.  If the point is inside an object, the distance field is negative.

Constructing a distance field is an incredibly involved and complex topic that is perhaps beyond the scope of this article.  Luckily, there are some excellent resources online about distance fields, such as [this excellent resource from Inigo Quilez listing a number of common distance field primatives](http://iquilezles.org/www/articles/distfunctions/distfunctions.htm).  For the purposes of this article, I will borrow from Inigo and draw a simple torus at the origin of the scene:

{% highlight c linenos %}
// Torus
// t.x: diameter
// t.y: thickness
// Adapted from: http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdTorus(float3 p, float2 t)
{
    float2 q = float2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// This is the distance field function.  The distance field represents the closest distance to the surface
// of any object we put in the scene.  If the given point (point p) is inside of an object, we return a
// negative answer.
float map(float3 p) {
    return sdTorus(p, float2(1, 0.2));
}
{% endhighlight %}

In this case, ``map`` defines the distance field that describes a torus with diameter 1.0 and thickness 0.2, located at the origin of the scene.  This ``map`` function is perhaps the most creative and fun aspect of raymarching, so I recommend you have fun with it!  Try new primitives out, combinations of primitives, or even your own weird custom shapes!  Once again, you should [check out this resource for more distance field equations](http://iquilezles.org/www/articles/distfunctions/distfunctions.htm).

### Writing the Raymarch Function

Now that we have built a distance field to sample, we can write the core raymarch loop.  This loop will be called from the fragment shader, and as explained at the top of this post, is responsible for "marching" a sample point along the current pixel's ray.  The raymarch function returns a color: the color of whatever object the ray hits (or a completely transparent color if no object is found).  The raymarch function essentially boils down to a simple ``for`` loop, as shown below:

{% highlight c linenos %}
// Raymarch along given ray
// ro: ray origin
// rd: ray direction
fixed4 raymarch(float3 ro, float3 rd) {
    fixed4 ret = fixed4(0,0,0,0);

    const int maxstep = 64;
    float t = 0; // current distance traveled along ray
    for (int i = 0; i < maxstep; ++i) {
        float3 p = ro + rd * t; // World space position of sample
        float d = map(p);       // Sample of distance field (see map())

        // If the sample <= 0, we have hit something (see map()).
        if (d < 0.01) {
            // Simply return a gray color if we have hit an object
            // We will deal with lighting later.
            ret = fixed4(0.5, 0.5, 0.5, 1);
            break;
        }

        // If the sample > 0, we haven't hit anything yet so we should march forward
        // We step forward by distance d, because d is the minimum distance possible to intersect
        // an object (see map()).
        t += d;
    }

    return ret;
}
{% endhighlight %}

In each iteration of the raymarch loop, we sample a point along the ray.  If we hit something, then bail out of the loop and return a color (in other words, the color of the object).  If we don't hit anything (the result of ``map`` is greater than zero) then we move forward by the distance given to us by the distance field.  If you're confused, [revisit the theory discussed at the beginning of the article](#introduction-to-raymarching).

If you find yourself building extremely complex scenes with lots of small details, you may need to increase the ``maxstep`` constant on line 7 (at an increased performance cost).  You also might want to carefully tweak ``maxstep`` anyway to see how many samples you can get away with (64 samples in this case is overkill for a simple torus, but for the sake of example I'll keep it).

Now all that's left is to call ``raymarch()`` from the fragment shader.  This is simply done like so:

{% highlight c linenos %}
// Provided by our script
uniform float3 _CameraWS;

// ...

fixed4 frag (v2f i) : SV_Target
{
    // ray direction
    float3 rd = normalize(i.ray.xyz);
    // ray origin (camera position)
    float3 ro = _CameraWS;

    fixed3 col = tex2D(_MainTex,i.uv);
    fixed4 add = raymarch(ro, rd);

    // Returns final color using alpha blending
    return fixed4(col*(1.0 - add.w) + add.xyz * add.w,1.0);
}
{% endhighlight %}

All we are doing here is receiving our ray data from the vertex shader and passing it along to ``raymarch()``.  We finally blend the result with ``_MainTex`` (the rendered scene before applying this shader) using [alpha blending](https://en.wikipedia.org/wiki/Alpha_compositing#Alpha_blending).  Recall that ``_CameraWS`` represents the world-space position of the camera and was passed to the shader as a uniform [earlier in our C# script](#step-2-passing-the-rays-to-the-gpu).

Open up Unity again, and behold!  A torus!

<div style="max-width:500px;display:block;margin:0 auto;">
    <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="WholeWeirdFirefly"></div>
</div>
<p style="text-align: center">
    <i>Look mom, no polygons!</i>
</p>

## Adding Lighting

*\[Not written\]*

## Interacting With Mesh-Based Objects

*\[Not written\]*

## Resources
- [Inigo Quilez's blog](http://www.iquilezles.org/www/index.htm) is in my opinion the seminal resource on Raymarching Distance fields.  His articles discuss advanced raymarching techniques.
- [This Gamedev Stackexchange discussion](http://gamedev.stackexchange.com/questions/67719/how-do-raymarch-shaders-work) gives some interesting background into how raymarching shaders work fundamentally, and offers some alternative usecases of raymarching such as volumetric lighting.