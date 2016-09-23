---
title: HTC Vive Teleportation System with Parabolic Pointer
tag: project
---

Here I present an easy-to-use teleportation system for the HTC Vive and the Unity game engine. The system is modelled
after Valve&#39;s game for the Vive [*The Lab*](http://store.steampowered.com/app/450390/), a game where the player can
traverse VR environments that are bigger than the play area.  You can check out the project source code
[here on Github](https://github.com/Flafla2/Vive-Teleporter).  The Github project is open source and licenced under the MIT
licence.

<div style="max-width:750px;display:block;margin:0 auto;">
    <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="HonorableComplexCutworm"></div>
</div>
<p style="text-align: center">
    <i>Myself demoing the system in the HTC Vive</i>
</p>

I intend on writing another article in the near future detailing some of the challenges that I ran into during the production
of this system.  Look out for that soon!

<!--break-->

This system solves a number of problems:

* **Calculating Navigable Space**: You obviously don't want the player to be able to teleport out of bounds, or inside
   opaque objects.  To solve this problem, my system uses Unity's generated Navigation Mesh as the boundaries that the
   player can teleport to.  Because this process is piggybacking Unity's work, it is stable and can be used reliably
   in most projects.  In order to preload this data, simply add a "Vive Nav Mesh" component anywhere in your scene, and
   click the "Update Navmesh Data" button in the inspector.  You can of course update the Vive Nav Mesh component with
   new NavMesh bakes whenever you update the scene.  The above process is illustrated below:
   
   <div style="max-width:750px;display:block;margin:0 auto;">
      <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="SorrowfulThriftyAfricanpiedkingfisher"></div>
   </div>
  <p style="text-align: center">
      <i>The process of updating the Vive navmesh.</i>
  </p>
* **Selecting a Teleport Destination**: This system uses an intuitive parabolic curve selection mechanism using simple
  kinematic equations.  Once again, this was inspired by Valve's *The Lab*.  As the user raises their controller to a higher
  angle, the selection point grows farther away.  If the user raises the remote past 45 degrees (maximum distance of a parabolic
  curve) the angle stays locked at that distance.
* **Representing the Play Area**: It is often useful to know where the chaperone boundaries will be after teleporting.  For
  this reason the system draws a box around where the chaperone bounds will be.
* **Reducing Discomfort**: The screen fades in and fades out upon teleportation (the display "blinks"), reducing fatigue
  and nausea for the user.

Once again you can take a look at the project [here on Github](https://github.com/Flafla2/Vive-Teleporter).  Thanks for
reading!