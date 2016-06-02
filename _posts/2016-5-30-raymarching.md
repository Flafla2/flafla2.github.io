---
title: Raymarching Distance Fields&#58; Concepts and Implementation in Unity
---

*Raymarching* is a fairly new technique used to render realtime scenes.  The technique is particularly interesting because it is entirely computed in a screen-space shader.  In other words, no discrete mesh data is provided to the renderer and the scene is drawn on a single quad that covers the camera's field of vision.  Objects in the scene are defined by an analytic equation that describes the shortest distance between a point and the surface of any object in the scene (hence the full name *Raymarching Distance Fields*).  It turns out that with only this information you can compose some strikingly complicated and beautiful scenes.  Further, because you aren't using polygonal meshes (and are instead using mathematical equations) it is possible to define perfectly smooth surfaces, unlike in a traditional renderer.

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



## Resources
- [Inigo Quilez's blog](http://www.iquilezles.org/www/index.htm) is perhaps the seminal resource on Raymarching Distance fields.  His articles discuss advanced raymarching techniques.
- [This Gamedev Stackexchange discussion](http://gamedev.stackexchange.com/questions/67719/how-do-raymarch-shaders-work) gives some interesting background into how raymarching shaders work fundamentally, and offers some alternative usecases of raymarching such as volumetric lighting.