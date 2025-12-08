import React, { useState } from "react";
import { VRApp } from "@/entities/VRApp";
import { with429Retry } from "@/components/utils/retry";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";

// Complete app data from PDF
const APP_DATA_FROM_PDF = [
  { 
    name: "Cook-Out", 
    genre: ["סימולציה", "פעולה"], 
    store_link: "https://www.meta.com/experiences/cook-out/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro", "PCVR"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "עד 4" }], 
    internet_required: true 
  },
  { 
    name: "MultiBrush", 
    genre: ["אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/multibrush/", 
    education_field: ["אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Human Anatomy VR Learning - Irusu", 
    genre: ["סימולציה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/human-anatomy-vr/", 
    education_field: ["ביולוגיה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Awake Heart", 
    genre: ["חוויה", "בריאות וכושר"], 
    store_link: "https://www.meta.com/experiences/awake-heart/", 
    education_field: ["בריאות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Among Us VR", 
    genre: ["חברתי", "אסטרטגיה"], 
    store_link: "https://www.meta.com/experiences/among-us-vr/", 
    education_field: ["חינוך חברתי"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro", "PCVR"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "עד 10" }], 
    internet_required: true 
  },
  { 
    name: "Beat Saber", 
    genre: ["מוזיקה וקצב"], 
    store_link: "https://www.meta.com/experiences/beat-saber/", 
    education_field: ["מוזיקה"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro", "PSVR"], 
    player_count_details: [{ mode: "שחקן יחיד / רב־משתתפים", count: "1-∞" }], 
    internet_required: true 
  },
  { 
    name: "Hand Physics Lab", 
    genre: ["סימולציה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/hand-physics-lab/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Spatial", 
    genre: ["פרודוקטיביות", "חברתי"], 
    store_link: "https://www.meta.com/experiences/spatial/", 
    education_field: ["חינוך", "עיצוב"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Music VR", 
    genre: ["אמנות", "מוזיקה"], 
    store_link: "https://www.meta.com/experiences/music-vr/", 
    education_field: ["מוזיקה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Ocean Rift", 
    genre: ["חוויות", "סימולציה"], 
    store_link: "https://www.meta.com/experiences/ocean-rift/", 
    education_field: ["ביולוגיה", "טבע"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Sep's Diner", 
    genre: ["פעולה", "סימולציה"], 
    store_link: "https://www.meta.com/experiences/seps-diner/", 
    education_field: ["ניהול"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Sugar Mess", 
    genre: ["יריות", "פעולה"], 
    store_link: "https://www.meta.com/experiences/sugar-mess/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Dance Loop", 
    genre: ["מוזיקה וקצב"], 
    store_link: "https://www.meta.com/experiences/dance-loop/", 
    education_field: ["מוזיקה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Hand Tool Parts", 
    genre: ["סימולציה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/hand-tool-parts/", 
    education_field: ["טכנולוגיה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Wander", 
    genre: ["חינוך", "חוויות"], 
    store_link: "https://www.meta.com/experiences/wander/", 
    education_field: ["גיאוגרפיה", "היסטוריה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Keep Talking and Nobody Dies", 
    genre: ["פעולה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/keep-talking-and-nobody-dies/", 
    education_field: ["תקשורת", "חשיבה לוגית"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Color Space", 
    genre: ["אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/color-space/", 
    education_field: ["אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Pets VR", 
    genre: ["סימולציה", "ילדים ומשפחה"], 
    store_link: "https://www.meta.com/experiences/pets-vr/", 
    education_field: ["ביולוגיה", "אחריות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Rooms of Realities", 
    genre: ["הרפתקה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/rooms-of-realities/", 
    education_field: ["חשיבה ביקורתית", "STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "עד 4" }], 
    internet_required: true 
  },
  { 
    name: "Onward", 
    genre: ["פעולה", "יריות"], 
    store_link: "https://www.meta.com/experiences/onward/", 
    education_field: ["אסטרטגיה"], 
    supported_platforms: ["Quest 2", "Quest 3", "PCVR"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Loco Dojo Unleashed", 
    genre: ["פעולה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/loco-dojo-unleashed/", 
    education_field: ["חשיבה קבוצתית", "STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Rube Goldberg Workshop", 
    genre: ["סימולציה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/rube-goldberg-workshop/", 
    education_field: ["פיזיקה", "STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Untangled", 
    genre: ["חוויה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/untangled/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Escape Simulator VR", 
    genre: ["חוויות", "פאזל"], 
    store_link: "https://www.meta.com/experiences/escape-simulator-vr/", 
    education_field: ["חשיבה לוגית", "שיתופיות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "SPHERES", 
    genre: ["מדע", "חוויות"], 
    store_link: "https://www.meta.com/experiences/spheres/", 
    education_field: ["אסטרונומיה", "חלל"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Remio", 
    genre: ["פרודוקטיביות", "חברתי"], 
    store_link: "https://www.meta.com/experiences/remio/", 
    education_field: ["עבודה שיתופית"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Language Lab", 
    genre: ["שפה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/language-lab/", 
    education_field: ["שפה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Rage Room VR", 
    genre: ["פעולה", "בידור"], 
    store_link: "https://www.meta.com/experiences/rage-room-vr/", 
    education_field: ["רגש", "וויסות עצמי"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Sports Scramble", 
    genre: ["ספורט", "קז'ואל"], 
    store_link: "https://www.meta.com/experiences/sports-scramble/", 
    education_field: ["חינוך גופני"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "I Expect You To Die", 
    genre: ["הרפתקה", "פאזל"], 
    store_link: "https://www.meta.com/experiences/i-expect-you-to-die/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Home Sweet Home", 
    genre: ["הרפתקה", "אימה"], 
    store_link: "https://www.meta.com/experiences/home-sweet-home/", 
    education_field: ["פסיכולוגיה", "רגש"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "POPULATION: ONE", 
    genre: ["פעולה", "יריות"], 
    store_link: "https://www.meta.com/experiences/population-one/", 
    education_field: ["אסטרטגיה"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "עד 24" }], 
    internet_required: true 
  },
  { 
    name: "Meteoric VR", 
    genre: ["מדע", "חינוך"], 
    store_link: "https://www.meta.com/experiences/meteoric-vr/", 
    education_field: ["חלל", "פיזיקה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "YouTube VR", 
    genre: ["מדיה", "בידור"], 
    store_link: "https://www.meta.com/experiences/youtube-vr/", 
    education_field: ["חינוך", "אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3", "PCVR"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Multiverse", 
    genre: ["חוויות", "חברתי"], 
    store_link: "https://www.meta.com/experiences/multiverse/", 
    education_field: ["חינוך", "אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Enhance", 
    genre: ["פאזל", "חינוך"], 
    store_link: "https://www.meta.com/experiences/enhance/", 
    education_field: ["קוגניציה", "מוח"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Mission: ISS", 
    genre: ["חינוך", "סימולציה"], 
    store_link: "https://www.meta.com/experiences/mission-iss/", 
    education_field: ["חלל", "פיזיקה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Anne Frank House VR", 
    genre: ["חינוך", "היסטוריה"], 
    store_link: "https://www.meta.com/experiences/anne-frank-house/", 
    education_field: ["היסטוריה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Bogo", 
    genre: ["חוויות", "ילדים ומשפחה"], 
    store_link: "https://www.meta.com/experiences/bogo/", 
    education_field: ["אחריות", "טבע"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Liminal", 
    genre: ["חוויה", "בריאות וכושר"], 
    store_link: "https://www.meta.com/experiences/liminal/", 
    education_field: ["רגש", "רפה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Roblox", 
    genre: ["יצירה", "חברתי"], 
    store_link: "https://www.meta.com/experiences/roblox/", 
    education_field: ["תכנות", "יצירתיות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Mondly", 
    genre: ["שפה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/mondly/", 
    education_field: ["שפה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "SketchAR", 
    genre: ["אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/sketchar/", 
    education_field: ["אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: true 
  },
  { 
    name: "Immerse", 
    genre: ["שפה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/immerse/", 
    education_field: ["שפה", "תקשורת"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Open Blocks", 
    genre: ["יצירה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/open-blocks/", 
    education_field: ["עיצוב", "טכנולוגיה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "ShapesXR", 
    genre: ["אמנות ויצירה", "פרודוקטיביות"], 
    store_link: "https://www.meta.com/experiences/shapesxr/", 
    education_field: ["שפה", "תקשורת"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Muze XR Social Virtual Museum & Beyond", 
    genre: ["אמנות", "חינוך"], 
    store_link: "https://www.meta.com/experiences/muze-xr-social-virtual-museum/", 
    education_field: ["אמנות", "היסטוריה"], 
    supported_platforms: ["Quest 2", "Quest 3", "Quest Pro"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Virtual Antiquities Museum", 
    genre: ["היסטוריה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/virtual-antiquities-museum/", 
    education_field: ["אמנות", "היסטוריה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Virtual Gallery", 
    genre: ["אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/virtual-gallery/", 
    education_field: ["היסטוריה", "תרבות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Muze XR", 
    genre: ["אמנות", "חינוך"], 
    store_link: "https://www.meta.com/experiences/muze-xr/", 
    education_field: ["אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Parallax", 
    genre: ["אמנות", "חוויות"], 
    store_link: "https://www.meta.com/experiences/parallax/", 
    education_field: ["אמנות", "חינוך"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "The Under Presents", 
    genre: ["תיאטרון", "חוויות"], 
    store_link: "https://www.meta.com/experiences/the-under-presents/", 
    education_field: ["אמנות", "מדע"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Quest Night Cafe", 
    genre: ["אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/quest-night-cafe/", 
    education_field: ["אמנות", "בידור"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Stencil VR", 
    genre: ["חינוך", "אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/stencil-vr/", 
    education_field: ["אמנות", "חינוך"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "First Steps", 
    genre: ["הדרכה", "חוויות"], 
    store_link: "https://www.meta.com/experiences/first-steps/", 
    education_field: ["חלל", "מדע"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Virtual Museum VR", 
    genre: ["היסטוריה", "חינוך"], 
    store_link: "https://www.meta.com/experiences/virtual-museum-vr/", 
    education_field: ["טכנולוגיה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Arteon – The Living Museum", 
    genre: ["חינוך", "אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/arteon/", 
    education_field: ["אמנות", "טכנולוגיה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Dear Angelica VR", 
    genre: ["חוויות", "אמנות"], 
    store_link: "https://www.meta.com/experiences/dear-angelica/", 
    education_field: ["אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "The Key", 
    genre: ["דרמה", "חוויות"], 
    store_link: "https://www.meta.com/experiences/the-key/", 
    education_field: ["אמנות", "היסטוריה"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "רב־משתתפים", count: "∞" }], 
    internet_required: true 
  },
  { 
    name: "Elixir", 
    genre: ["פנטזיה", "סימולציה"], 
    store_link: "https://www.meta.com/experiences/elixir/", 
    education_field: ["אמפתיה", "ערכים"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "PaintMusic", 
    genre: ["מוזיקה", "אמנות ויצירה"], 
    store_link: "https://www.meta.com/experiences/paintmusic/", 
    education_field: ["אמנות", "רגש"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "Out There", 
    genre: ["חינוך", "הרפתקה"], 
    store_link: "https://www.meta.com/experiences/out-there/", 
    education_field: ["STEM"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
  { 
    name: "INVASION! Anniversary Edition", 
    genre: ["אנימציה", "חוויות"], 
    store_link: "https://www.meta.com/experiences/invasion/", 
    education_field: ["מוזיקה", "אמנות"], 
    supported_platforms: ["Quest 2", "Quest 3"], 
    player_count_details: [{ mode: "שחקן יחיד", count: "1" }], 
    internet_required: false 
  },
];

export default function UpdateAppsFromPDF() {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleUpdate = async () => {
    setStatus("loading");
    setProgress("מתחיל עדכון...");
    setLog([]);

    try {
      addLog("מאחזר את כל האפליקציות הקיימות...");
      const existingApps = await with429Retry(() => VRApp.list());
      
      // Create a map of existing apps by normalized name
      const appsByName = new Map();
      existingApps.forEach(app => {
        const normalizedName = (app.name || "").trim().toLowerCase();
        appsByName.set(normalizedName, app);
      });

      addLog(`נמצאו ${existingApps.length} אפליקציות במערכת.`);
      addLog("מתחיל עדכון אפליקציות עם נתונים מה-PDF...\n");

      let updatedCount = 0;
      let notFoundCount = 0;

      for (const pdfApp of APP_DATA_FROM_PDF) {
        const normalizedPdfName = (pdfApp.name || "").trim().toLowerCase();
        const existingApp = appsByName.get(normalizedPdfName);

        if (!existingApp) {
          notFoundCount++;
          addLog(`⚠ לא נמצאה: ${pdfApp.name}`);
          continue;
        }

        // Update the app with new data
        const updateData = {
          genre: pdfApp.genre || [],
          store_link: pdfApp.store_link || "",
          education_field: pdfApp.education_field || [],
          supported_platforms: pdfApp.supported_platforms || [],
          player_count_details: pdfApp.player_count_details || [],
          internet_required: pdfApp.internet_required || false,
          purchase_type: "app_purchase" // Set default purchase type
        };

        await with429Retry(() => VRApp.update(existingApp.id, updateData));
        updatedCount++;
        addLog(`✓ עודכנה: ${pdfApp.name}`);
      }

      addLog(`\n=== סיכום ===`);
      addLog(`סה"כ אפליקציות עודכנו: ${updatedCount}`);
      addLog(`לא נמצאו במערכת: ${notFoundCount}`);

      setStatus("success");
      setProgress("העדכון הושלם בהצלחה!");

    } catch (error) {
      console.error("Update failed:", error);
      setStatus("error");
      setProgress(`שגיאה: ${error.message}`);
      addLog(`❌ שגיאה: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-900">עדכון אפליקציות מ-PDF</h1>
          <BackHomeButtons />
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6" />
              עדכון נתוני אפליקציות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              פעולה זו תעדכן את כל האפליקציות הקיימות במערכת עם המידע המלא מקובץ ה-PDF:
              ז'אנרים, קישורי חנות, תחומים חינוכיים, פלטפורמות, מספר שחקנים ודרישות אינטרנט.
            </p>
            <p className="text-sm text-slate-500">
              סה"כ {APP_DATA_FROM_PDF.length} אפליקציות יעודכנו.
            </p>

            <div className="flex justify-center py-6">
              <Button
                onClick={handleUpdate}
                disabled={status === "loading"}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  <>
                    <RefreshCw className="ml-2 h-6 w-6" />
                    עדכן אפליקציות
                  </>
                )}
              </Button>
            </div>

            {status !== "idle" && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  {status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {status === "error" && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {progress}
                </h3>
                <div className="h-96 overflow-y-auto bg-slate-900 text-white font-mono text-sm p-4 rounded-md" dir="ltr">
                  {log.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap">&gt; {line}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}