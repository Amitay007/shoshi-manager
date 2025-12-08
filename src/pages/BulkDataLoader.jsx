
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { with429Retry } from "@/components/utils/retry";

export default function BulkDataLoader() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState("");

  const addLog = (msg) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString("he-IL")}] ${msg}`]);
  };

  // App names from the files - UPDATED with correct apps
  const APP_NAMES = [
    "Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart",
    "Among Us", "Beat Saber", "Hand Physics Lab", "Spatial", "Paint", "Music",
    "Ocean Rift", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts",
    "Wander", "Keep Talking And Nobody Dies", "Color Space", "Pets VR",
    "Rooms of Realities", "Onward", "Loco Dojo Unleashed", "Rube Goldberg Workshop",
    "Untangled", "Escape Simulator", "SPHERES", "Remio", "Language Lab",
    "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home",
    "POPULATION: ONE", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance",
    "Mission: ISS", "Anne Frank House", "Bogo", "Immerse", "Liminal", "Roblox", "Mondly",
    "SketchAR", "Open Blocks", "ShapesXR",
    "Muze XR Social Virtual Museum & Beyond", "VR Art Gallery: Alexandra Buckle",
    "Virtual Antiquities Museum", "Virtual Gallery", "Muze XR", "Parallax",
    "The Under Presents", "Quest Night Cafe", "Stencil VR", "First Steps",
    "Virtual Museum VR", "Arteon – The Living Museum", "Dear Angelica VR",
    "The Key", "Elixir"
  ];

  // Device to apps mapping - FIXED: Removed duplicate PaintMusic, kept only Paint and Music separately
  const DEVICE_APPS_MAP = {
    1: ["Cook-Out", "MultiBrush", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Mission: ISS", "Anne Frank House", "Bogo", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die"],
    2: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Ocean Rift", "Wander", "Pets VR", "Loco Dojo Unleashed", "Rube Goldberg Workshop", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    3: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Loco Dojo Unleashed", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    4: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Ocean Rift", "Rooms of Realities", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Mondly", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    5: ["Cook-Out", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Loco Dojo Unleashed", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    6: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    7: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Color Space", "Rooms of Realities", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo", "Untangled"],
    8: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Ocean Rift", "Sep's Diner", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Liminal", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    9: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    10: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Mondly", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    11: ["Cook-Out", "MultiBrush", "Awake Heart", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Rooms of Realities", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Untangled", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    12: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Onward", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Liminal", "Roblox", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    13: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Pets VR", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Untangled", "Escape Simulator", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    14: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Rooms of Realities", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House"],
    15: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Hand Physics Lab", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    16: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    17: ["Cook-Out", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Hand Physics Lab", "Onward", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    18: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    19: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Untangled", "Escape Simulator", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    20: ["Cook-Out", "MultiBrush", "Among Us", "Beat Saber", "Hand Physics Lab", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    21: ["Keep Talking And Nobody Dies", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Untangled", "Hand Tool Parts", "Hand Physics Lab", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    22: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Hand Tool Parts", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    23: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Keep Talking And Nobody Dies", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    24: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Keep Talking And Nobody Dies", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    25: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Hand Physics Lab", "Keep Talking And Nobody Dies", "Onward", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    26: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Keep Talking And Nobody Dies", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    27: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Color Space", "Keep Talking And Nobody Dies", "Onward", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    28: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Sep's Diner", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Color Space", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    29: ["Cook-Out", "MultiBrush", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Sugar Mess", "Dance Loop", "Hand Tool Parts", "Spatial", "Paint", "Music", "Keep Talking And Nobody Dies", "Escape Simulator", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Mission: ISS", "Anne Frank House", "Bogo"],
    30: ["Cook-Out", "Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Hand Tool Parts", "Spatial", "Paint", "Music", "Color Space", "Keep Talking And Nobody Dies", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Escape Simulator", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    31: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Beat Saber", "Color Space", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    32: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Color Space", "SPHERES", "Remio", "Language Lab", "Rage Room VR", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    33: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Among Us", "Beat Saber", "Color Space", "SPHERES", "Remio", "Language Lab", "Sports Scrambl", "I Expect You To Die", "Home Sweet Home", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    34: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "SPHERES", "Remio", "Rage Room VR", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House", "Bogo"],
    35: ["Human Anatomy VR Learning -Irusu", "Awake Heart", "Remio", "Language Lab", "Sports Scrambl", "Onward", "Meteoric VR", "YouTub VR", "Multiverse", "Enhance", "Mission: ISS", "Anne Frank House"],
    36: ["Human Anatomy VR Learning -Irusu", "Awake Heart"],
  };

  // Devices data from file 1
  const DEVICES_DATA = [
    { binocular_number: 1, device_name: "Lilit261179", model: "Meta Quest 2", headset_type: "Meta Quest 2", purchase_date: "2023-01-01", price: 1400, status: "פעיל", usage_role: "תלמיד", primary_email: "Lilit261179@gmail.com", gmail_password: "Applab0#", meta_email: "Lilit261179@gmail.com", meta_password: "Applab0#", applab_email: "Lilit261179@gmail.com", applab_password: "Applab0#", facebook_email: "Lilit261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 2, device_name: "Aliciam261179", primary_email: "Aliciam261179@gmail.com", gmail_password: "Applab0#", meta_email: "Aliciam261179@gmail.com", meta_password: "Applab0#", applab_email: "Aliciam261179@gmail.com", applab_password: "Applab0#", facebook_email: "Aliciam261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 3, device_name: "Beneser33", primary_email: "Beneser33@gmail.com", gmail_password: "Applab0#", meta_email: "Beneser33@gmail.com", meta_password: "Applab0#", applab_email: "Beneser33@gmail.com", applab_password: "Applab0#", facebook_email: "Beneser33@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 4, device_name: "John", primary_email: "Johndewey261179@gmail.com", gmail_password: "Applab0#", meta_email: "Johndewey261179@gmail.com", meta_password: "Applab0#", applab_email: "Johndewey261179@gmail.com", applab_password: "Applab0#", facebook_email: "Johndewey261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 5, device_name: "Rachelblu95", primary_email: "Rachelblu94@gmail.com", gmail_password: "Applab0#", meta_email: "Rachelblu94@gmail.com", meta_password: "Applab0#", applab_email: "Rachelblu94@gmail.com", applab_password: "Applab0#", facebook_email: "Rachelblu94@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 6, device_name: "Wise", primary_email: "Wisepenny065@gmail.com", gmail_password: "#Applab0", meta_email: "Wisepenny065@gmail.com", meta_password: "Applab0#", applab_email: "Wisepenny065@gmail.com", applab_password: "Applab0#", facebook_email: "Wisepenny065@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 7, device_name: "Zina", primary_email: "Zina261179@gmail.com", gmail_password: "Applab0#", meta_email: "Zina261179@gmail.com", meta_password: "Applab0#", applab_email: "Zina261179@gmail.com", applab_password: "Applab0#", facebook_email: "Zina261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 8, device_name: "Barak", primary_email: "Barak261179@gmail.com", gmail_password: "Applab0#", meta_email: "Barak261179@gmail.com", meta_password: "Applab0#", applab_email: "Barak261179@gmail.com", applab_password: "Applab0#", facebook_email: "Barak261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 9, device_name: "Yadlin", primary_email: "Yadlin261179@gmail.com", gmail_password: "Applab0#", meta_email: "Yadlin261179@gmail.com", meta_password: "Applab0#", applab_email: "Yadlin261179@gmail.com", applab_password: "Applab0#", facebook_email: "Yadlin261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 10, device_name: "Golda", primary_email: "Golda261179@gmail.com", gmail_password: "Applab0#", meta_email: "Golda261179@gmail.com", meta_password: "Applab0#", applab_email: "Golda261179@gmail.com", applab_password: "Applab0#", facebook_email: "Golda261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 11, device_name: "Peres261179", primary_email: "Peres261179@gmail.com", gmail_password: "Applab0#", meta_email: "Peres261179@gmail.com", meta_password: "Applab0#", applab_email: "Peres261179@gmail.com", applab_password: "Applab0#", facebook_email: "Peres261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 12, device_name: "Dayan", primary_email: "Dayan261179@gmail.com", gmail_password: "Applab12#", meta_email: "Dayan261179@gmail.com", meta_password: "Applab0#", applab_email: "Dayan261179@gmail.com", applab_password: "Applab0#", facebook_email: "Dayan261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 13, device_name: "Monic", primary_email: "Monic261179@gmail.com", gmail_password: "Applab0#", meta_email: "Monic261179@gmail.com", meta_password: "Applab0#", applab_email: "Monic261179@gmail.com", applab_password: "Applab0#", facebook_email: "Monic261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 14, device_name: "Eilan", primary_email: "Eilanramon07@gmail.com", gmail_password: "Applab0#", meta_email: "Eilanramon07@gmail.com", meta_password: "Applab0#", applab_email: "Eilanramon07@gmail.com", applab_password: "Applab0#", facebook_email: "Eilanramon07@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 15, device_name: "Rani261179", primary_email: "anotherreality20002@gmail.com", gmail_password: "Applab0#", meta_email: "Rani261179@gmail.com", meta_password: "Applab0#", applab_email: "Rani261179@gmail.com", applab_password: "Applab0#", facebook_email: "Rani261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 16, device_name: "Michelleyoya", primary_email: "Michelleyoya261179@gmail.com", gmail_password: "Applab0#", meta_email: "Michelleyoya261179@gmail.com", meta_password: "Applab0#", applab_email: "Michelleyoya261179@gmail.com", applab_password: "Applab0#", facebook_email: "Michelleyoya261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 17, device_name: "Talsum261179", primary_email: "Talsum261179@gmail.com", gmail_password: "Applab0#", meta_email: "Talsum261179@gmail.com", meta_password: "Applab0#", applab_email: "Talsum261179@gmail.com", applab_password: "Applab0#", facebook_email: "Talsum261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 18, device_name: "Lorena Bobit", primary_email: "Bobit261179@gmail.com", gmail_password: "Applab0#", meta_email: "Bobit261179@gmail.com", meta_password: "Applab0#", applab_email: "Bobit261179@gmail.com", applab_password: "Applab0#", facebook_email: "Bobit261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 19, device_name: "Noamva", primary_email: "Noamva261179@gmail.com", gmail_password: "Applab0#", meta_email: "Noamva261179@gmail.com", meta_password: "Applab0#", applab_email: "Noamva261179@gmail.com", applab_password: "Applab0#", facebook_email: "Noamva261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 20, device_name: "Yael", primary_email: "Yaelrom261179@gmail.com", gmail_password: "Applab0#", meta_email: "Yaelrom261179@gmail.com", meta_password: "Applab0#", applab_email: "Yaelrom261179@gmail.com", applab_password: "Applab0#", facebook_email: "Yaelrom261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 21, device_name: "Maudwagner261179", primary_email: "Maudwagner261179@gmail.com", gmail_password: "Applab0#", meta_email: "Maudwagner261179@gmail.com", meta_password: "Applab0#", applab_email: "Maudwagner261179@gmail.com", applab_password: "Applab0#", facebook_email: "Maudwagner261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 22, device_name: "Sendy", primary_email: "Sendy261179@gmail.com", gmail_password: "Applab0#", meta_email: "Sendy261179@gmail.com", meta_password: "Applab0#", applab_email: "Sendy261179@gmail.com", applab_password: "Applab0#", facebook_email: "Sendy261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 23, device_name: "vr20003", primary_email: "Anotherreality2003@gmail.com", gmail_password: "Applab0#", meta_email: "Anotherreality2003@gmail.com", meta_password: "Applab0#", applab_email: "Anotherreality2003@gmail.com", applab_password: "Applab0#", facebook_email: "Anotherreality2003@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 24, device_name: "Snoofkin", primary_email: "Snoofkin261179@gmail.com", gmail_password: "Applab0#", meta_email: "Snoofkin261179@gmail.com", meta_password: "Applab0#", applab_email: "Snoofkin261179@gmail.com", applab_password: "Applab0#", facebook_email: "Snoofkin261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 25, device_name: "Moomin", primary_email: "Moomin261179@gmail.com", gmail_password: "Applab0#", meta_email: "Moomin261179@gmail.com", meta_password: "Applab0#", applab_email: "Moomin261179@gmail.com", applab_password: "Applab0#", facebook_email: "Moomin261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 26, device_name: "Bilbi", primary_email: "Bilbi261179@gmail.com", gmail_password: "Applab0#", meta_email: "Bilbi261179@gmail.com", meta_password: "Applab0#", applab_email: "Bilbi261179@gmail.com", applab_password: "Applab0#", facebook_email: "Bilbi261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 27, device_name: "Elizabeth080922", primary_email: "Elizabeth080922@gmail.com", gmail_password: "Applab0#", meta_email: "Elizabeth080922@gmail.com", meta_password: "Applab0#", applab_email: "Elizabeth080922@gmail.com", applab_password: "Applab0#", facebook_email: "Elizabeth080922@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 28, device_name: "Danny", primary_email: "Dannyk261179@gmail.com", gmail_password: "Applab0#", meta_email: "Dannyk261179@gmail.com", meta_password: "Applab0#", applab_email: "Dannyk261179@gmail.com", applab_password: "Applab0#", facebook_email: "Dannyk261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 29, device_name: "Barsum", primary_email: "Barsum261179@gmail.com", gmail_password: "Applab0#", meta_email: "Barsum261179@gmail.com", meta_password: "Applab0#", applab_email: "Barsum261179@gmail.com", applab_password: "Applab0#", facebook_email: "Barsum261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 30, device_name: "Barbara", primary_email: "Straisand261179@gmail.com", gmail_password: "Applab0#", meta_email: "Straisand261179@gmail.com", meta_password: "Applab0#", applab_email: "Straisand261179@gmail.com", applab_password: "Applab0#", facebook_email: "Straisand261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 31, device_name: "Tovtov", primary_email: "Tovtov261179@gmail.com", gmail_password: "Applab0#", meta_email: "Tovtov261179@gmail.com", meta_password: "Applab0#", applab_email: "Tovtov261179@gmail.com", applab_password: "Applab0#", facebook_email: "Tovtov261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 32, device_name: "Gargamel", primary_email: "Gargamel261179@gmail.com", gmail_password: "Applab0#", meta_email: "Gargamel261179@gmail.com", meta_password: "Applab0#", applab_email: "Gargamel261179@gmail.com", applab_password: "Applab0#", facebook_email: "Gargamel261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 33, device_name: "Dvora", primary_email: "Dvora261179@gmail.com", gmail_password: "Applab0#", meta_email: "Dvora261179@gmail.com", meta_password: "Applab0#", applab_email: "Dvora261179@gmail.com", applab_password: "Applab0#", facebook_email: "Dvora261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 34, device_name: "Yona", primary_email: "yona261179@gmail.com", gmail_password: "Applab0#", meta_email: "yona261179@gmail.com", meta_password: "Applab0#", applab_email: "yona261179@gmail.com", applab_password: "Applab0#", facebook_email: "yona261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 35, device_name: "plotnik261179", primary_email: "plotnik231179@gmail.com", gmail_password: "Applab0#", meta_email: "plotnik231179@gmail.com", meta_password: "Applab0#", applab_email: "plotnik231179@gmail.com", applab_password: "Applab0#", facebook_email: "plotnik231179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 36, device_name: "gaon261179", primary_email: "gaon261179@gmail.com", gmail_password: "Applab0#", meta_email: "gaon261179@gmail.com", meta_password: "Applab0#", applab_email: "gaon261179@gmail.com", applab_password: "Applab0#", facebook_email: "gaon261179@gmail.com", facebook_password: "Applab0#" },
    { binocular_number: 37, device_name: "Jordan", primary_email: "jordanp261179@gmail.com", gmail_password: "Applab0#" },
    { binocular_number: 38, device_name: "Roni", primary_email: "roniron261179@gmail.com", gmail_password: "Applab0#" },
  ];

  const handleLoad = async () => {
    setStatus("loading");
    setLog([]);
    setProgress("");

    try {
      addLog("מתחיל טעינת נתונים...");
      
      // Step 1: Create/Update all apps and mark them as installed
      setProgress("שלב 1/4: יוצר אפליקציות...");

      let existingAppsInDB = await with429Retry(() => base44.entities.VRApp.list());
      const appNameToId = {}; // This will hold the final map of appName -> appId

      // Populate appNameToId and identify apps that need updating for 'is_installed' status
      for (const app of existingAppsInDB) {
        appNameToId[(app.name || "").trim().toLowerCase()] = app.id;
      }

      let appsCreatedCount = 0;
      const newAppsPayload = [];
      const appsToUpdateInstalledStatus = [];

      // First, identify apps that need to be created or updated for their installed status
      for (const appName of APP_NAMES) {
        const appNameLower = appName.trim().toLowerCase();
        const existingAppId = appNameToId[appNameLower];

        if (!existingAppId) {
          // App does not exist, prepare for creation
          newAppsPayload.push({
            name: appName,
            is_installed: true,
            is_research: false
          });
        } else {
          // App exists, check if it needs 'is_installed' update
          const appInDB = existingAppsInDB.find(a => (a.name || "").trim().toLowerCase() === appNameLower);
          if (appInDB && !appInDB.is_installed) {
            appsToUpdateInstalledStatus.push({ id: existingAppId, name: appName });
          }
        }
      }

      // Bulk create new apps
      if (newAppsPayload.length > 0) {
        addLog(`נמצאו ${newAppsPayload.length} אפליקציות חדשות ליצירה.`);
        const createdApps = await with429Retry(() => base44.entities.VRApp.bulkCreate(newAppsPayload));
        appsCreatedCount = createdApps.length;
        addLog(`נוצרו ${appsCreatedCount} אפליקציות חדשות.`);

        // Update appNameToId with newly created apps
        createdApps.forEach(app => {
          appNameToId[app.name.trim().toLowerCase()] = app.id;
        });
      } else {
        addLog("אין אפליקציות חדשות ליצירה.");
      }

      // Update existing apps to ensure they are marked as installed
      addLog("מסמן את האפליקציות כמותקנות...");
      let appsUpdatedAsInstalledCount = 0;
      for (const appToUpdate of appsToUpdateInstalledStatus) {
        await with429Retry(() => base44.entities.VRApp.update(appToUpdate.id, { is_installed: true }));
        appsUpdatedAsInstalledCount++;
      }
      addLog(`עודכנו ${appsUpdatedAsInstalledCount} אפליקציות לסטטוס 'מותקנת'.`);
      addLog(`סה"כ אפליקציות חדשות שנוצרו: ${appsCreatedCount}. סה"כ אפליקציות קיימות שעודכנו ל'מותקנת': ${appsUpdatedAsInstalledCount}`);
      addLog(`(סה"כ אפליקציות רשומות במערכת: ${Object.keys(appNameToId).length})`);


      // Step 2: Create/Update Devices
      addLog("\n=== שלב 2: יצירת משקפות ===");
      setProgress("יוצר משקפות...");
      
      const existingDevices = await with429Retry(() => base44.entities.VRDevice.list());
      const deviceNumToId = {};
      existingDevices.forEach(d => {
        deviceNumToId[d.binocular_number] = d.id;
      });

      let devicesCreated = 0;
      for (const deviceData of DEVICES_DATA) {
        const devicePayload = {
          binocular_number: deviceData.binocular_number,
          device_name: deviceData.device_name,
          primary_email: deviceData.primary_email,
          model: deviceData.model || "Meta Quest 2",
          headset_type: deviceData.headset_type || "Meta Quest 2",
          purchase_date: deviceData.purchase_date,
          price: deviceData.price,
          status: deviceData.status || "פעיל",
          usage_role: deviceData.usage_role || "תלמיד"
        };

        if (deviceNumToId[deviceData.binocular_number]) {
          // Update existing
          await with429Retry(() => base44.entities.VRDevice.update(
            deviceNumToId[deviceData.binocular_number],
            devicePayload
          ));
          addLog(`↻ עודכנה משקפת #${deviceData.binocular_number}`);
        } else {
          // Create new
          const created = await with429Retry(() => base44.entities.VRDevice.create(devicePayload));
          deviceNumToId[deviceData.binocular_number] = created.id;
          devicesCreated++;
          addLog(`✓ נוצרה משקפת #${deviceData.binocular_number} (${deviceData.device_name})`);
        }
      }
      addLog(`סה"כ משקפות חדשות: ${devicesCreated}/${DEVICES_DATA.length}`);

      // Step 3: Create/Update Linked Accounts
      addLog("\n=== שלב 3: יצירת חשבונות משויכים ===");
      setProgress("יוצר חשבונות משויכים...");
      
      let accountsCreated = 0;
      for (const deviceData of DEVICES_DATA) {
        const deviceId = deviceNumToId[deviceData.binocular_number];
        if (!deviceId) continue;

        const accountTypes = [
          { type: "GMAIL", email: deviceData.primary_email, password: deviceData.gmail_password },
          { type: "META", email: deviceData.meta_email, password: deviceData.meta_password },
          { type: "App Lab", email: deviceData.applab_email, password: deviceData.applab_password },
          { type: "Facebook", email: deviceData.facebook_email, password: deviceData.facebook_password },
        ];

        for (const acc of accountTypes) {
          if (!acc.email) continue;
          
          const existing = await with429Retry(() => 
            base44.entities.DeviceLinkedAccount.filter({ device_id: deviceId, account_type: acc.type })
          );

          if (existing && existing.length > 0) {
            // Update
            await with429Retry(() => base44.entities.DeviceLinkedAccount.update(existing[0].id, {
              email: acc.email,
              password: acc.password
            }));
          } else {
            // Create
            await with429Retry(() => base44.entities.DeviceLinkedAccount.create({
              device_id: deviceId,
              account_type: acc.type,
              email: acc.email,
              password: acc.password
            }));
            accountsCreated++;
          }
        }
        addLog(`✓ חשבונות למשקפת #${deviceData.binocular_number}`);
      }
      addLog(`סה"כ חשבונות חדשים: ${accountsCreated}`);

      // Step 4: Create DeviceApp relationships
      addLog("\n=== שלב 4: שיוך אפליקציות למשקפות ===");
      setProgress("משייך אפליקציות למשקפות...");
      
      const existingRelations = await with429Retry(() => base44.entities.DeviceApp.list());
      const existingRelationsSet = new Set(
        existingRelations.map(r => `${r.device_id}_${r.app_id}`)
      );

      let relationsCreated = 0;
      for (const [deviceNum, appNames] of Object.entries(DEVICE_APPS_MAP)) {
        const deviceId = deviceNumToId[Number(deviceNum)];
        if (!deviceId) continue;

        for (const appName of appNames) {
          const appId = appNameToId[appName.toLowerCase()];
          if (!appId) {
            addLog(`⚠ לא נמצא app_id עבור: ${appName}`);
            continue;
          }

          const relationKey = `${deviceId}_${appId}`;
          if (!existingRelationsSet.has(relationKey)) {
            await with429Retry(() => base44.entities.DeviceApp.create({
              device_id: deviceId,
              app_id: appId
            }));
            relationsCreated++;
          }
        }
        addLog(`✓ אפליקציות למשקפת #${deviceNum}: ${appNames.length} אפליקציות`);
      }
      addLog(`סה"כ שיוכים חדשים: ${relationsCreated}`);

      setStatus("success");
      setProgress("הטעינה הושלמה בהצלחה!");
      addLog("\n=== סיום מוצלח! ===");
      
    } catch (error) {
      console.error("Load failed:", error);
      setStatus("error");
      setProgress(`שגיאה: ${error.message}`);
      addLog(`❌ שגיאה: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-900">טעינת נתונים מקבצים</h1>
          <Link to={createPageUrl("Home")}>
            <Button variant="outline">חזרה למסך הראשי</Button>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">טעינה אוטומטית של כל הנתונים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">מה יבוצע:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>יצירת {APP_NAMES.length} אפליקציות (במידה ואינן קיימות)</li>
                <li>סימון כל האפליקציות הקיימות ברשימה כ'מותקנות'</li>
                <li>יצירת {DEVICES_DATA.length} משקפות (במידה ואינן קיימות)</li>
                <li>יצירת חשבונות משויכים (Gmail, Meta, AppLab, Facebook) לכל משקפת</li>
                <li>שיוך אפליקציות למשקפות לפי המיפוי מהקובץ</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleLoad}
                disabled={status === "loading"}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-12 py-8 text-xl"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    טוען נתונים...
                  </>
                ) : (
                  "התחל טעינה"
                )}
              </Button>
            </div>

            {progress && (
              <div className="text-center text-lg font-semibold text-cyan-700">
                {progress}
              </div>
            )}

            {status !== "idle" && log.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  {status === "success" && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {status === "error" && <AlertTriangle className="w-6 h-6 text-red-500" />}
                  {status === "loading" && <Loader2 className="w-6 h-6 animate-spin text-blue-500" />}
                  <h3 className="text-xl font-semibold">לוג פעולות:</h3>
                </div>
                <div className="h-96 overflow-y-auto bg-slate-900 text-white font-mono text-sm p-4 rounded-lg" dir="ltr">
                  {log.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap">{line}</div>
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
