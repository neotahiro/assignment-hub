// ===== EDIT THIS FILE to add your coursework, then commit & push. =====
// Dates: "YYYY-MM-DD". Every item needs a unique id (used to remember "done").
// module: 1-9. Leave arrays empty if nothing yet.
const SUBJECTS = [
  {
    id: "pol101", name: "EDSD 510: Ecology and Environment",
    assignments: [
      { id: "pol-a1", module: 2, title: "Write down a 600-800 words reflection report on how understanding the basics of ecology including population ecology (structure, dynamics), community ecology (structure, dynamics), ecological relationships/interactions and interdependence and anthropogenic determinants of ecological imbalance have applied relevance to sustainable development. Shape your write-up based on the discussions in the class.", done: true }
    ],
readings: [],
    notes: [
      { id: "pol-n1", module: 1, title: "Lecture 1 slides", link: "https://drive.google.com/" }
    ]
  },
  { id: "subj2", name: "EDSD 512: Fundamentals of Sustainable Development", assignments: [
    { id: "fsd-a1", module: 1, title: "Community Engagement 2026", link: "https://drive.google.com/file/d/1e6h_cu_luMan6sABGRYJ0KwEjgI8POsi/view", due: "2026-12-19" },
    { id: "fsd-a2", module: 2, title: "Individual Assignment: Environmental Issues in Nepal (2026)", due: "2026-10-10" }
  ], readings: [], notes: [
    { id: "fsd-n1", module: 1, title: "Module 0 and 1, Week 1-3 Complete Lectures Slides", link: "https://drive.google.com/file/d/1XrbfI4friEV9r65EVqeO_IyEPUa5U_Dk/view" },
    { id: "fsd-n2", module: 2, title: "Module 2, Week 4 Three Pillars", link: "https://drive.google.com/file/d/1bhnHLn1yc_vUEoe1RaRy_srAcRAuYTfH/view" },
    { id: "fsd-n3", module: 1, title: "Community Engagement General Implementation Directives", link: "https://docs.google.com/document/d/1hIQpVbFYvbi1jqSU8hSf1JplTqv_i1Tq/edit" },
    { id: "fsd-n4", module: 2, title: "Individual Assignment: Environmental Issues in Nepal (2026)", link: "https://drive.google.com/file/d/1hzDeERv8ONANkicXdH33BdIHLaty2yzi/view" }
  ] },
{ id: "subj3", name: "EDSD 516: Global Change and Sustainable Technology",
  assignments: [
    { id: "gcst-a1", module: 2, title: "Certificate/Final Page Snapshot Upload", due: "2026-09-30", time: "17:00" },
    { id: "gcst-a2", module: 2, title: "Mind Map", due: "2026-10-16", time: "22:07" },
    { id: "gcst-a3", module: 3, title: "Assignment Three: Record a video where you must be visible in the whole frame or side by side with your narration explaining why climate change is just an one tip of coupled changes, how we should act to minimise its negative consequences to humankind. The video must have three to four minutes of narration/video where you should be visible at least for 30 seconds; the rest you can add animations if you wish, but not extending five minutes in total. Share it through Google Drive or a YouTube link in Moodle.", due: "2026-11-16", time: "20:45" }
  ],
  readings: [
    { id: "gcst-r1", module: 2, title: "The Impacts of Climate Change by Trevor M. Letcher, Chapter 21 (pg. 491-499)", link: "https://drive.google.com/file/d/1vnGAH4kvY-da2qiB979t7ayhFILU5Gbs/view" }
  ],
  notes: [] },
{ id: "subj4", name: "EDSD 518: Sociology and Local Cosmology of Sustainable Development", assignments: [
      { id: "soc-a1", module: 1, title: "Assignment 1: Choose a topic of your interests related to human-ecology relations, and write a reflective piece of 500-800 words from the perspective of sustainability.", done: true },
      { id: "soc-a2", module: 2, title: "Write a short reflective note on the relationship between consumerism and ecology, focusing on sustainability and human responsibility.", done: true },
      { id: "soc-a3", module: 3, title: "Assignment 2: Update Assignment 1 with relevant sociological theories in 500-800 words.", due: "2026-10-28" }
], notes: [],
  readings: [
    { id: "soc-r1", module: 1, title: "Moran, E. F. (2006). People and Nature: An introduction to human ecological relations (pp. 1-23). Blackwell Publishing.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2297/People%20and%20Nature%20An%20introduction%20to%20human%20ecological%20relations%20%28pp.%201-23%29.pdf" },
    { id: "soc-r2", module: 1, title: "Seghezzo, L. (2009). The Five Dimensions of Sustainability. Environmental Politics, 18(4), 539-556.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2297/2%20The%20five%20dimensions%20of%20sustainability.pdf" },
    { id: "soc-r3", module: 1, title: "Billson, J. M. (2020). Sociology and the Sustainable Development Goals: Or, Do We Really Have a Role in Changing the World? Journal of Applied Social Science, 14(2), 127-144.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2297/Sociology%20and%20Sustainable%20Development%20Goals.pdf" },
    { id: "soc-r4", module: 1, title: "Passerini, E. (1998). Sustainability and sociology. American Sociologist, 29(3), 59-70.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2297/3%20Sustainability%20and%20Sociology.pdf" },
    { id: "soc-r5", module: 2, title: "Mills, C. W. (2005). The Sociological Imagination. In R. Matson (Ed.), The Spirit of Sociology: A Reader (pp. 11-20). Pearson Education, Indian Reprint.", link: "https://drive.google.com/file/d/1s3n8DWLqVMF0rOZKMxR7IRhz3w33TUH3/view?usp=sharing" },
    { id: "soc-r6", module: 2, title: "Giddens, A. & Sutton, P. (2016). Sociology (Chapter 5: The Environment, pp. 157-203). Polity.", link: "https://drive.google.com/file/d/19F2L04PpitUyQQLUkTYAyUgldI-xrdHZ/view?usp=sharing" },
    { id: "soc-r7", module: 2, title: "Hannigan, J. (2014). Environmental Sociology: Key perspectives and controversies. In Environmental Sociology (3rd ed., pp. 19-52). Routledge.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/Environmental%20Sociology%20%28John%20Hannigan%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29.pdf" },
    { id: "soc-r8", module: 2, title: "Curry, T., Jiobu, R., & Schwirian, K. (2008). Sociological Analysis of Stratification and Class. In Sociology: For the Twenty First Century (5th ed., pp. 191-197). Pearson.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/Sociology%20for%20the%20twenty-first%20century%20%28Curry%2C%20Timothy%20J.%20%28Timothy%20Jon%29%2C%201943-%20etc.%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29.pdf" },
    { id: "soc-r9", module: 2, title: "Baer, H. A. (2020). Climate Change and Capitalism. In S. A. H. Hosseini, J. Goodman, S. C. Motta & B. K. Gills (Eds.), The Routledge Handbook of Transformative Global Studies (pp. 312-329). Routledge.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/The%20Routledge%20Handbook%20of%20Transformative%20Global%20Studies%20First%20Edition%20%28S.%20A.%20Hamed%20Hosseini%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29.pdf" },
    { id: "soc-r10", module: 2, title: "Marcuse, H. (2022). One-Dimensional Society. In One-Dimensional Man: Studies in the ideology of advanced industrial society (pp. 3-87). Routledge.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/One%20Dimensional%20Man%20Studies%20in%20the%20Ideology%20of%20Advanced%20Industrial%20Society%20%28Herbert%20Marcuse%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29%20%281%29.pdf" },
    { id: "soc-r11", module: 2, title: "Kellner, D. (2023). Jean Baudrillard. In G. Ritzer (Ed.), The Blackwell Companion to Major Contemporary Social Theorists (pp. 310-332). Blackwell Publishing.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/Contemporary%20Social%20Theorists%20book.pdf" },
    { id: "soc-r12", module: 2, title: "Ritzer, G. (2010). Sociological Theory (8th ed.). McGraw Hill.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/2293/%5BGeorge_Ritzer%5D_Sociological_Theory_%288th_Edition%29%28z-lib.org%29.pdf" },
    { id: "soc-r13", module: 3, title: "Kaza, S. (2010). How much is enough?: Buddhist perspectives on consumerism. In R. K. Payne (Ed.), How much is enough? Buddhism, consumerism, and the human environment (pp. 39-57). Wisdom Publications.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/How%20Much%20Is%20Enough%20Buddhism%2C%20Consumerism%2C%20and%20the%20Human%20Environment%20%28Payne%2C%20Richard%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29.pdf" },
    { id: "soc-r14", module: 3, title: "Whyte, K. (2017). What do Indigenous knowledge do for Indigenous peoples? In M. K. Nelson & D. Shilling (Eds.), Keepers of the Green World: Traditional Ecological Knowledge and Sustainability (Forthcoming). SSRN-Elsevier.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/ssrn-2612715.pdf" },
    { id: "soc-r15", module: 3, title: "Whyte, K. P. (2020). Indigenous realism and climate change. In M. Gabriel & K. Illingworth (Eds.), Climate Realism (pp. 69-81). Routledge.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/Climate%20Realism%20The%20Aesthetics%20of%20Weather%20and%20Atmosphere%20in%20the%20Anthropocene%20%28Lynn%20Badia%2C%20Marija%20Cetini%C4%87%20etc.%29%20%28z-library.sk%2C%201lib.sk%2C%20z-lib.sk%29.pdf" },
    { id: "soc-r16", module: 3, title: "Acharya, K. K., & Zafarullah, H. (2017). Service delivery and development at the grassroots: The evolution and contribution of community-based organisations in Nepal. Asia Pacific Journal of Public Administration, 39(4), 276-286.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/community-based%20organisations%20in%20Nepal.pdf" },
    { id: "soc-r17", module: 3, title: "Sharma, S., Bajracharya, R., & Sitaula, B. (2009). Indigenous technology knowledge in Nepal: A review. Indian Journal of Traditional Knowledge, 8(4), 569-576.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/Indigenous_Technology_Knowledge_in_Nepal.pdf" },
    { id: "soc-r18", module: 3, title: "Magni, G. (2017). Indigenous knowledge and implications for the sustainable development agenda. European Journal of Education, 52(4), 437-447.", link: "https://kusoede.edu.np/pluginfile.php/3401/course/section/4874/Indigenous%20knowledge%20and%20implications%20for%20the%20sustainable%20%20development.pdf" }
  ] },
  { id: "subj5", name: "EDSD 508: Theory and Practice in Education", assignments: [], readings: [], notes: [] }
];
const MODULE_COUNT = 9;
