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
      { id: "pol-n1", module: 1, title: "Module 1.0 Basics of Environment and its Importance", link: "https://docs.google.com/presentation/d/1LeBKo2KLYQ7hDLOb7kjO5xE5otVqq3_q/edit" },
      { id: "pol-n2", module: 1, title: "Module 1.1 Basic Concept of Ecology", link: "https://drive.google.com/file/d/1pBsIo5IwGRIPMFM1o9KTW3hfZp4HLam1/view" },
      { id: "pol-n3", module: 1, title: "Module 1.2 Community Ecology", link: "https://drive.google.com/file/d/1W1fGDrDZaAS7ezNGdE99yzRWrFEkK1K_/view" },
      { id: "pol-n4", module: 1, title: "Module 1.3 Ecological Interactions", link: "https://drive.google.com/file/d/1m_DzABMLI4y7RaQj5thlvieKa1urFMNm/view" },
      { id: "pol-n5", module: 1, title: "Module 1.4 Ecological Balance and Determinants", link: "https://drive.google.com/file/d/1cPo61u9jKtT_NT7n4HtogRThqD83aF40/view" }
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
    { id: "gcst-a1", module: 1, title: "Article Reviews", done: true },
    { id: "gcst-a2", module: 2, title: "Certificate/Final Page Snapshot Upload", due: "2026-09-30", time: "17:00" },
    { id: "gcst-a3", module: 2, title: "Mind Map", due: "2026-10-16", time: "22:07" },
    { id: "gcst-a4", module: 3, title: "Assignment Three: Record a video where you must be visible in the whole frame or side by side with your narration explaining why climate change is just an one tip of coupled changes, how we should act to minimise its negative consequences to humankind. The video must have three to four minutes of narration/video where you should be visible at least for 30 seconds; the rest you can add animations if you wish, but not extending five minutes in total. Share it through Google Drive or a YouTube link in Moodle.", due: "2026-11-16", time: "20:45" }
  ],
  readings: [
    { id: "gcst-r1", module: 1, title: "Sustainable Development (1987-2005) - An Oxymoron Comes of Age", link: "https://drive.google.com/file/d/1Zmt_098z7ScZWiXegy0BZetYhoJVlrFE/view" },
    { id: "gcst-r2", module: 1, title: "Conception of time, socioeconomic development and cultural values by Hamid Yeganeh", link: "https://drive.google.com/file/d/1moSm7MmNIxu50XcTLS7_CMvPl1RXwHMx/view" },
    { id: "gcst-r3", module: 1, title: "Observed trends in Earth System behavior by WIll Steffen", link: "https://drive.google.com/file/d/1A1L__4GEhANJH9MyT5EVCfIap0kOXgnm/view" },
    { id: "gcst-r4", module: 2, title: "The Impacts of Climate Change by Trevor M. Letcher, Chapter 21 (pg. 491-499)", link: "https://drive.google.com/file/d/1vnGAH4kvY-da2qiB979t7ayhFILU5Gbs/view" },
    { id: "gcst-r5", module: 3, title: "The Age of Sustainable Development by Jefferey Sachs, Chapter 12: Climate Change (pg. 393-440)", link: "https://drive.google.com/file/d/1IgJt-QgQzjzkb-r3iKpLccWArC9s1bAM/view?usp=drive_link" }
  ],
  notes: [
   { id: "gcst-n1", module: 1, title: "Course Outline", link: "https://drive.google.com/file/d/1Zmt_098z7ScZWiXegy0BZetYhoJVlrFE/view" },
    { id: "gcst-n2", module: 1, title: "Lecture 1: Introduction", link: "https://docs.google.com/presentation/d/1G8k5T0TIETgO6Ckt09mLjx_xp3_yQu-o/edit?usp=drive_link&ouid=118012022294365404947&rtpof=true&sd=true" },
    { id: "gcst-n3", module: 1, title: "Lecture 2: Global Change, Natural System and Changes", link: "https://drive.google.com/file/d/1O22jSrk9sIkH2dyzajZiBIhkfJbpMeI9/view" },
    { id: "gcst-n4", module: 1, title: "Lecture 2: Global Change, Natural System and Changes (contd...)", link: "https://drive.google.com/file/d/1cvckCsOo-VMoVNzbsfN5nD0lV44qNLID/view" },
    { id: "gcst-n5", module: 2, title: "Lecture: Global Changes, Climate Change Interactions and Impacts", link: "https://docs.google.com/presentation/d/1NxaZ35ndhO7pN3wtOFLZ1_n6dZipShAJ/edit?usp=drive_link&ouid=118012022294365404947&rtpof=true&sd=true" },
    { id: "gcst-n6", module: 2, title: "Lecture: Social Impacts of Global Changes including CC", link: "https://docs.google.com/presentation/d/11OgCxSq-van5XlMprZT0X361T81XgNNm/edit?usp=drive_link&ouid=118012022294365404947&rtpof=true&sd=true" },
    { id: "gcst-n7", module: 3, title: "Getting Deeper in Climate Science", link: "https://docs.google.com/presentation/d/12Dg2tkDYfiVKn0PhrO_53kPQmrRccby2/edit?usp=drive_link&ouid=118012022294365404947&rtpof=true&sd=true" }
  ] },
{ id: "subj4", name: "EDSD 518: Sociology and Local Cosmology of Sustainable Development", assignments: [
      { id: "soc-a1", module: 1, title: "Assignment 1: Choose a topic of your interests related to human-ecology relations, and write a reflective piece of 500-800 words from the perspective of sustainability.", done: true },
      { id: "soc-a2", module: 2, title: "Write a short reflective note on the relationship between consumerism and ecology, focusing on sustainability and human responsibility.", done: true },
      { id: "soc-a3", module: 3, title: "Assignment 2: Update Assignment 1 with relevant sociological theories in 500-800 words.", due: "2026-10-28" }
], notes: [],
  readings: [
    { id: "soc-r1", module: 1, title: "Moran, E. F. (2006). People and Nature: An introduction to human ecological relations (pp. 1-23). Blackwell Publishing.", link: "https://drive.google.com/file/d/1PQnQkBL_Wuwl1aRekmNAePffPIhc_PyD/view" },
    { id: "soc-r2", module: 1, title: "Seghezzo, L. (2009). The Five Dimensions of Sustainability. Environmental Politics, 18(4), 539-556.", link: "https://drive.google.com/file/d/1RT_dLWCxwfPTvGthlJsGqKSttr9sPPzb/view" },
    { id: "soc-r3", module: 1, title: "Billson, J. M. (2020). Sociology and the Sustainable Development Goals: Or, Do We Really Have a Role in Changing the World? Journal of Applied Social Science, 14(2), 127-144.", link: "https://drive.google.com/file/d/1vJ1mAfoxcJw55drSHFKzIE9r_uNxrLdM/view" },
    { id: "soc-r4", module: 1, title: "Passerini, E. (1998). Sustainability and sociology. American Sociologist, 29(3), 59-70.", link: "https://drive.google.com/file/d/10tGWaSdI6fseJoQdS_g6wGe_vLKYjzDq/view" },
    { id: "soc-r5", module: 2, title: "Mills, C. W. (2005). The Sociological Imagination. In R. Matson (Ed.), The Spirit of Sociology: A Reader (pp. 11-20). Pearson Education, Indian Reprint.", link: "https://drive.google.com/file/d/1M-rnqXW3_SsUIALb3Jpuo0dP7hM0rjih/view" },
    { id: "soc-r6", module: 2, title: "Giddens, A. & Sutton, P. (2016). Sociology (Chapter 5: The Environment, pp. 157-203). Polity.", link: "https://drive.google.com/file/d/1J8hYFKsCcKUBRLn-qX3cZcD7TkEcxEdw/view" },
    { id: "soc-r7", module: 2, title: "Hannigan, J. (2014). Environmental Sociology: Key perspectives and controversies. In Environmental Sociology (3rd ed., pp. 19-52). Routledge.", link: "https://drive.google.com/file/d/1W_4PKCq1WMnKmHpfGDdVDQTvPkhG1y-e/view" },
    { id: "soc-r8", module: 2, title: "Curry, T., Jiobu, R., & Schwirian, K. (2008). Sociological Analysis of Stratification and Class. In Sociology: For the Twenty First Century (5th ed., pp. 191-197). Pearson.", link: "https://drive.google.com/file/d/19lft9Yo9lVJOT_n9e2GGRhoFk2fg8Afr/view" },
    { id: "soc-r9", module: 2, title: "Baer, H. A. (2020). Climate Change and Capitalism. In S. A. H. Hosseini, J. Goodman, S. C. Motta & B. K. Gills (Eds.), The Routledge Handbook of Transformative Global Studies (pp. 312-329). Routledge.", link: "https://drive.google.com/file/d/1fUnt5VZAWxCk-D1pzHqjNkOt8_9wKY5P/view" },
    { id: "soc-r10", module: 2, title: "Marcuse, H. (2022). One-Dimensional Society. In One-Dimensional Man: Studies in the ideology of advanced industrial society (pp. 3-87). Routledge.", link: "https://drive.google.com/file/d/1v_0-33T26PgZJZ58rL851bH7uZoTo4Hx/view" },
    { id: "soc-r11", module: 2, title: "Kellner, D. (2023). Jean Baudrillard. In G. Ritzer (Ed.), The Blackwell Companion to Major Contemporary Social Theorists (pp. 310-332). Blackwell Publishing.", link: "https://drive.google.com/file/d/1nw1JMxnWwZYy5bL4zZqc6OKjIvTjv1q2/view" },
    { id: "soc-r12", module: 2, title: "Ritzer, G. (2010). Sociological Theory (8th ed.). McGraw Hill.", link: "https://drive.google.com/file/d/1mCNxJBV_CMK9lfVbwMpVPxlpPVyOiH0h/view" },
    { id: "soc-r13", module: 3, title: "Kaza, S. (2010). How much is enough?: Buddhist perspectives on consumerism. In R. K. Payne (Ed.), How much is enough? Buddhism, consumerism, and the human environment (pp. 39-57). Wisdom Publications.", link: "https://drive.google.com/file/d/1ZwAAq1JxgtJ3epzI6ww4Gdlrzq7SX8rg/view" },
    { id: "soc-r14", module: 3, title: "Whyte, K. (2017). What do Indigenous knowledge do for Indigenous peoples? In M. K. Nelson & D. Shilling (Eds.), Keepers of the Green World: Traditional Ecological Knowledge and Sustainability (Forthcoming). SSRN-Elsevier.", link: "https://drive.google.com/file/d/1lM22IZgaH7LO6m9oj1U0_A4DODeZclw8/view" },
    { id: "soc-r15", module: 3, title: "Whyte, K. P. (2020). Indigenous realism and climate change. In M. Gabriel & K. Illingworth (Eds.), Climate Realism (pp. 69-81). Routledge.", link: "https://drive.google.com/file/d/1DV84isXRlGFCoFAz4bFm3XaqHQXzOypx/view" },
    { id: "soc-r16", module: 3, title: "Acharya, K. K., & Zafarullah, H. (2017). Service delivery and development at the grassroots: The evolution and contribution of community-based organisations in Nepal. Asia Pacific Journal of Public Administration, 39(4), 276-286.", link: "https://drive.google.com/file/d/1L34ypsWtzlP9AZyjxKZW5LT0g6-aMLyW/view" },
    { id: "soc-r17", module: 3, title: "Sharma, S., Bajracharya, R., & Sitaula, B. (2009). Indigenous technology knowledge in Nepal: A review. Indian Journal of Traditional Knowledge, 8(4), 569-576.", link: "https://drive.google.com/file/d/10ARg8b3YyU11eUn3z7dvOHBDwFbtek3h/view" },
    { id: "soc-r18", module: 3, title: "Magni, G. (2017). Indigenous knowledge and implications for the sustainable development agenda. European Journal of Education, 52(4), 437-447.", link: "https://drive.google.com/file/d/1rGqcuNgIhM-WKyvn3LQtWjfI_On5kkCL/view" }
  ] },
  { id: "subj5", name: "EDSD 508: Theory and Practice in Education", assignments: [
    { id: "tpe-a1", module: 1, title: "Paper Review: Creative Learning for Sustainability in a World of AI", link: "https://drive.google.com/file/d/15kUASWSs_fpXASePgA_ngTf2mnU1sE_g/view", due: "2026-10-20" }
  ], readings: [
    { id: "tpe-r1", module: 1, title: "Dewey, J. (1938). Experience and Education. Kappa Delta Pi.", link: "https://drive.google.com/file/d/12eonJ5Fn4MzYIu2QHdBoElxk9ry9y72N/view" },
    { id: "tpe-r2", module: 1, title: "Freire, P. (1970). Pedagogy of the Oppressed (30th anniversary ed.). Continuum.", link: "https://drive.google.com/file/d/1IXirxggMQSngh7blwSuG5MOFpv4IeVyU/view" },
    { id: "tpe-r3", module: 1, title: "Schön, D. A. (1983). The Reflective Practitioner: How Professionals Think in Action. Basic Books.", link: "https://drive.google.com/file/d/1L0fGI02_fTisTnCCLR7_5h3LqTmFe8mz/view" },
    { id: "tpe-r4", module: 1, title: "RSA ANIMATE: Changing Education Paradigms. (2010, October 14). YouTube.", link: "https://www.youtube.com/watch?v=zDZFcDGpL4" }
  ], notes: [
    { id: "tpe-n1", module: 1, title: "Week 1 Presentation", link: "https://docs.google.com/presentation/d/1yNDxNlI9RE-5JKFtpVx5oFsi4a07Aepm/edit?slide=id.p1#slide=id.p1" },
    { id: "tpe-n2", module: 1, title: "Week 3 Presentation", link: "https://docs.google.com/presentation/d/1FwTdGEsH8BVr_cmCBJ_IlxHyQvW3mrVS/edit?slide=id.p1#slide=id.p1" }
  ] }
];
const GENERAL = [
  { id: "gen-a1", title: "Writing Task. URGENT! Tuesday Deadline.", due: "2026-10-06" }
];
const MODULE_COUNT = 5;
