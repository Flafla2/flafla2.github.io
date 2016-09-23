---
title: Implementing Skyward Sword&#39;s Timeshift Stones in Unity
tag: Technical Writeup
---

Nintendo is well-known for its polish and excellent use of resources, even while using the relatively underpowered Wii hardware.  They often develop game mechanics with this in mind, and this limitation brings out some of Nintendo&#39;s true genius in game design.  One of my favorite mechanics that take advantage of the hardware like this are the so-called *timeshift orbs* in *The Legend of Zelda: Skyward Sword*.  Essentially the idea behind these is that the timeshift orbs take everything in a radius around it and send it &quot;back in time&quot; like so:

<div style="max-width:512px;display:block;margin:0 auto;">
    <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="ConventionalPepperyJellyfish"></div>
</div>
<p style="text-align: center">
    <i>Zelda&#39;s Timeshift Orbs</i>
</p>

While this effect seems complicated at first, it is actually pretty simple to implement with a shader.<!--break-->

Here is the result that I achieved with Unity 4.6:

<div style="max-width:512px;display:block;margin:0 auto;">
    <div class="gfyitem" data-autoplay="true" data-responsive="true" data-id="ImpracticalFarColt"></div>
</div>
<p style="text-align: center">
    <i>My Implementation in Unity3D</i>
</p>

You can find the source code to my implementation [on my GitHub](http://github.com/Flafla2/Zelda-Timeshift-Demo).

All of the art in the demo is from the Asset Store:

- [Ground Textures Pack](http://u3d.as/content/nobiax-yughues/ground-textures-pack/5Tu)
- [Seamless Texture Pack](http://u3d.as/content/b-mstr-m/seamless-texture-pack/9kP)
- Unity&#39;s default skyboxes

<br />
You can find the commented shader code below, and once again check out the full project [on GitHub](http://github.com/Flafla2/Zelda-Timeshift-Demo).

{% highlight c linenos %}
Shader "Custom/Radial Texturer" {
    Properties {
        _DiffuseFar ("Diffuse (Far)", 2D) = "white" {}                              // Far textures are outside of the orb's sphere of influence
        _NormalFar ("Normal (Far)", 2D) = "bump" {}
        _SpecFar ("Specular (Far)", 2D) = "black" {}
        _DiffuseNear ("Diffuse (Near)", 2D) = "black" {}                            // Near textures are inside of the orb's sphere of influence
        _NormalNear ("Normal (Near)",2D) = "bump" {}
        _SpecNear ("Specular (Near)",2D) = "black" {}
        
        _Specularity ("Specularity", Float) = 1.0                                   // Specularity defines the size of the specular highlights on the 
                                                                                    // object (high values have a more defined highlight)
        
        _BorderColor ("Border Color", Color) = (1,1,1,1)                            // Color of the border.
        _BorderWidth ("Border Width", Float) = 0.1                                  // Width of the border in world units
        [HideInInspector]_LightPos ("Texturer Position", Vector) = (0,0,0,0)        // Position of the "light" (texture caster) in world
                                                                                    // space.  Edited via scripting.
        _LightRad ("Texturer Radius", Float) = 1.0                                  // Radius of the "light" (texture caster)
        [MaterialToggle] _Cylindrical ("Cylindrical (Ignore Y axis)", Float) = 0    // 0 = false, 1 = true
                                                                                    // If this is true the texturer ignores the y (vertical) axis
    }
    SubShader {
        Tags { "RenderType"="Opaque" }
        LOD 200
        
        CGPROGRAM
        #pragma surface surf ColoredSpecular

        sampler2D _DiffuseFar;
        sampler2D _NormalFar;
        sampler2D _SpecFar;
        sampler2D _DiffuseNear;
        sampler2D _NormalNear;
        sampler2D _SpecNear;
        
        float _LightRad;
        float _BorderWidth;
        float _Cylindrical;
        half _Specularity;
        float4 _LightPos;
        fixed4 _BorderColor;
        
        // CustomSurfaceOutput is used to have spec-maps
        struct CustomSurfaceOutput {
            half3 Albedo;
            half3 Normal;
            half3 Emission;
            half Specular;
            half3 GlossColor;
            half Alpha;
        };
        
        struct Input {
            float2 uv_DiffuseFar;   // Far-texture UV
            float2 uv_DiffuseNear;  // Near-texture UV
            float3 worldPos;        // World-space position of this fragment
        };
        
        // The primary surface shader calculation - switches textures given a distance from the orb.
        void surf (Input IN, inout CustomSurfaceOutput o) {
            float3 d = (float3)_LightPos-IN.worldPos;
            // Using Distance Squared eliminates the need for a costly square root calculation
            float distSq = d.x*d.x + d.z*d.z + (1.0f-_Cylindrical)*d.y*d.y;
            float farDistSq = _LightRad+_BorderWidth/2; farDistSq *= farDistSq;
            float nearDistSq = _LightRad-_BorderWidth/2; nearDistSq *= nearDistSq;
            
            // Alpha (gradient between inner and outer texture) is calculated using the distance
            // saturate() is used to limit the alpha to the range 0 - 1
            float alpha = saturate((distSq-nearDistSq)/(farDistSq-nearDistSq));
            // Border alpha is the alpha of the border (0-1) at a point.  This is cast to an integer so there is a hard border.
            // Remove (int) to get a soft gradient border.
            float border_alpha = (int)abs(alpha*2-1);
            //Below are the 4 
            half4 c_f = tex2D (_DiffuseFar, IN.uv_DiffuseFar);
            half4 c_n = tex2D (_DiffuseNear, IN.uv_DiffuseNear);
            half4 s_f = tex2D(_SpecFar,IN.uv_DiffuseFar);
            half4 s_n = tex2D(_SpecNear,IN.uv_DiffuseNear);
            o.Albedo = lerp(fixed3(0,0,0),lerp(c_n.rgb,c_f.rgb,alpha),border_alpha);;
            o.Alpha = lerp(c_n.a,c_f.a,alpha);
            o.GlossColor = lerp(s_n.rgb,s_f.rgb,alpha);
            o.Specular = lerp(s_n.a,s_f.a,alpha);
            
            o.Emission = lerp((fixed3)_BorderColor,fixed3(0,0,0),border_alpha);
        }
         
        // Custom lighting is required to have full specular maps
        // This calculates Specular color based on the given spec-map
        inline half4 LightingColoredSpecular (CustomSurfaceOutput s, half3 lightDir, half3 viewDir, half atten)
        {
          half3 h = normalize (lightDir + viewDir);
         
          half diff = max (0, dot (s.Normal, lightDir));
         
          float nh = max (0, dot (s.Normal, h));
          float spec = pow (nh, _Specularity)*s.Specular;
          half3 specCol = spec * s.GlossColor;
         
          half4 c;
          c.rgb = (s.Albedo * _LightColor0.rgb * diff + _LightColor0.rgb * specCol) * (atten * 2);
          c.a = s.Alpha;
          return c;
        }
         
        inline half4 LightingColoredSpecular_PrePass (CustomSurfaceOutput s, half4 light)
        {
            half3 spec = light.a * s.GlossColor;
           
            half4 c;
            c.rgb = (s.Albedo * light.rgb + light.rgb * spec);
            c.a = s.Alpha + spec * _SpecColor.a;
            return c;
        }
        ENDCG
    } 
    FallBack "Diffuse"
}
{% endhighlight %}