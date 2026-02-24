// supabase/functions/save-arrangement/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { userId, songData, sections, masterSections, importedData, isEditMode, editingSongId, isUser } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({
        error: "User not authenticated"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let savedSong;
    // 🔹 UPDATE SONG
    if (isEditMode && editingSongId) {
      const { data: profile } = await supabase.from("profiles").select("role, creator_type").eq("user_id", userId).single();
      
      // Check for pending request_arrangements if user is Arrangely creator trying to publish
      if (songData.visibility === "public" && profile?.role === "creator" && profile?.creator_type === "creator_arrangely") {
        const { data: pendingRequests } = await supabase
          .from("request_arrangements")
          .select("id")
          .eq("assigned_to", userId)
          .eq("status", "pending")
          .limit(1);
        
        if (pendingRequests && pendingRequests.length > 0) {
          return new Response(JSON.stringify({
            error: "You have pending arrangement requests. Please complete them before publishing new arrangements."
          }), {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      }
      
      const isPublicAllowed = songData.visibility === "public" && profile?.role === "creator";
      const { data: updatedSong, error: updateError } = await supabase.from("songs").update({
        title: songData.title || "Untitled Song",
        artist: songData.artist || null,
        current_key: songData.key,
        original_key: songData.key,
        tempo: parseInt(songData.tempo) || 120,
        time_signature: songData.timeSignature,
        tags: songData.tags ? songData.tags.split(",").map((t)=>t.trim()) : null,
        notes: importedData?.metadata?.notes?.join("\n") || null,
        is_public: isPublicAllowed,
        youtube_link: songData.youtubeLink || null,
        sequencer_drive_link: songData.sequencerDriveLink || null,
        sequencer_price: songData.sequencerPrice ? parseInt(songData.sequencerPrice) : 0
      }).eq("id", editingSongId).eq("user_id", userId).select().single();
      if (updateError) throw updateError;
      savedSong = updatedSong;
      await supabase.from("arrangements").delete().eq("song_id", editingSongId);
      await supabase.from("song_sections").delete().eq("song_id", editingSongId);
    } else {
      // 🔹 CREATE SONG
      const { data: profile } = await supabase.from("profiles").select("role,creator_type, display_name").eq("user_id", userId).single();
      
      // Check for pending request_arrangements if user is Arrangely creator trying to publish
      if (songData.visibility === "public" && profile?.role === "creator" && profile?.creator_type === "creator_arrangely") {
        const { data: pendingRequests } = await supabase
          .from("request_arrangements")
          .select("id")
          .eq("assigned_to", userId)
          .eq("status", "pending")
          .limit(1);
        
        if (pendingRequests && pendingRequests.length > 0) {
          return new Response(JSON.stringify({
            error: "You have pending arrangement requests. Please complete them before publishing new arrangements."
          }), {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      }
      
      let createdSign = "Arrangely";
      if ((profile?.creator_type === "creator_professional" || profile?.creator_type === "creator_pro") && profile?.display_name) {
        createdSign = profile.display_name;
      }
      const isPublicAllowed = songData.visibility === "public" && profile?.role === "creator";
      const { data: newSong, error: songError } = await supabase.from("songs").insert({
        title: songData.title || "Untitled Song",
        artist: songData.artist || null,
        current_key: songData.key,
        original_key: songData.key,
        tempo: parseInt(songData.tempo) || 120,
        time_signature: songData.timeSignature,
        tags: songData.tags ? songData.tags.split(",").map((t)=>t.trim()) : null,
        notes: importedData?.metadata?.notes?.join("\n") || null,
        user_id: userId,
        created_sign: createdSign,
        is_public: isPublicAllowed,
        youtube_link: songData.youtubeLink || null,
        sequencer_drive_link: songData.sequencerDriveLink || null,
        sequencer_price: songData.sequencerPrice ? parseInt(songData.sequencerPrice) : 0
      }).select().single();
      if (songError) throw songError;
      savedSong = newSong;
    }
    // 🔹 SAVE SECTIONS
    if (Object.keys(masterSections).length > 0) {
      const sectionsToInsert = Object.entries(masterSections).map(([type, section])=>({
          song_id: savedSong.id,
          section_type: type,
          lyrics: section.lyrics || null,
          chords: section.chords || null,
          section_time_signature: section.timeSignature || null,
          name: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")
        }));
      const { error: sectionsError } = await supabase.from("song_sections").insert(sectionsToInsert);
      if (sectionsError) throw sectionsError;
    }
    // 🔹 SAVE ARRANGEMENTS
    if (sections.length > 0) {
      const { data: masterSectionsData } = await supabase.from("song_sections").select("id, section_type, name").eq("song_id", savedSong.id);
      const sectionsToCreate = [];
      const arrangementMappings = [];
      for(let i = 0; i < sections.length; i++){
        const section = sections[i];
        const sectionName = section.type.charAt(0).toUpperCase() + section.type.slice(1).replace(/_/g, " ");
        const isUniqueSection = !masterSectionsData?.some((ms)=>ms.name?.toLowerCase() === sectionName.toLowerCase() && ms.section_type === section.type);
        if (isUniqueSection && masterSections[section.type]) {
          sectionsToCreate.push({
            song_id: savedSong.id,
            section_type: section.type,
            lyrics: masterSections[section.type].lyrics || null,
            chords: masterSections[section.type].chords || null,
            name: sectionName
          });
          arrangementMappings.push({
            position: i + 1,
            sectionType: section.type,
            sectionName,
            needsNewSection: true,
            notes: section.content || null
          });
        } else {
          const matchingSection = masterSectionsData?.find((s)=>s.section_type === section.type);
          arrangementMappings.push({
            position: i + 1,
            sectionId: matchingSection?.id,
            needsNewSection: false,
            notes: section.content || null
          });
        }
      }
      let newSections = [];
      if (sectionsToCreate.length > 0) {
        const { data: createdSections, error: newSectionsError } = await supabase.from("song_sections").insert(sectionsToCreate).select("id, section_type, name");
        if (newSectionsError) throw newSectionsError;
        newSections = createdSections || [];
      }
      const arrangementsToInsert = arrangementMappings.map((m)=>{
        let sectionId = m.sectionId;
        if (m.needsNewSection) {
          const newSection = newSections.find((ns)=>ns.section_type === m.sectionType && ns.name === m.sectionName);
          sectionId = newSection?.id;
        }
        return {
          song_id: savedSong.id,
          section_id: sectionId,
          position: m.position,
          notes: m.notes,
          repeat_count: 1
        };
      });
      const { error: arrangementsError } = await supabase.from("arrangements").insert(arrangementsToInsert);
      if (arrangementsError) throw arrangementsError;
    }
    // 🔹 LOG ACTIVITY
    await supabase.from("song_activity").insert({
      user_id: userId,
      song_id: savedSong.id,
      activity_type: "created"
    });
    return new Response(JSON.stringify({
      success: true,
      message: "Arrangement saved successfully",
      songId: savedSong.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("Save arrangement error:", err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
