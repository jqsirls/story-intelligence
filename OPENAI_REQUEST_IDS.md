# OpenAI False Positive Request IDs - Evidence

**Total False Positives:** 39+ rejections tagged `[sexual]`  
**Actual Sexual Content:** ZERO

**ALL of these are children with medical devices - therapeutic representation**

---

## Request IDs for OpenAI Support:

### Halo Device False Positives:

1. req_e5f789329a54433287a15bef8f0db933 - Mexican child, age 6, animal stickers
2. req_c99f728fbbf3442d93be5360d5b207f1 - Samoan child, age 6, ocean stickers
3. req_bfa98387b5214b6d976e2e5f8d1d4406 - Indian child, age 5, star stickers
4. req_f7cdf0000df544d9bad5e449be81a508 - Human child with halo device (medical)
5. req_bb612be9b00145eea7cae569f4db2372 - Superhero child with halo (attempt 1)
6. req_d36b825ae4384d6ca25c6e4fc798dbea - Superhero child with halo (attempt 2)
7. req_3e6b41e9657f4069a28f4c40c6d36f43 - Water elemental (fantasy context)
8. req_f6ee855153e247f7b3509e001c8e85a7 - Superhero halo device test
9. req_980d8ced8dcc4f2d83ba3eefff607a6b - African American (rejected attempt 1, later passed)
10. req_663d6118965648cdb7cf975cf4407dca - Chinese child (rejected attempt 1, later passed)
11. req_392d845fd22e4fd6b77ed15f2d85a6e6 - Human support frame (safest language)
12. req_345de3e61235436892ec6f6c37088c77 - Human support frame (attempt 2)
13. req_42f8a40d1eb04072b61660acdab7929a - Human support frame (attempt 3)
14. req_21b3a7838c2d4cd78a245a47519cccd2 - Early halo device test
15. req_4843abb63d31433290f13357fa584897 - Halo device variation
16. req_50266712c273483995c814d010c71a46 - Halo device variation
17. req_6a4b68769a914ffa8c44e5930fa0c0ba - Halo device variation
18. req_848698e7cc9b49158309c71ae6ae6df0 - Halo device variation
19. req_8749959f6743461d9637c1761d6b71fc - Halo device variation
20. req_8995286afd4e4d95884e7c1caddfaab4 - Halo device variation
21. req_b6edfe2826264d36b9d65cda3b2238d3 - Halo device variation
22. req_b8812a012a6b4c89a600b86886e488b1 - Halo device variation
23. req_c4af11d41a14419baa492c264384ce70 - Halo device variation
24. req_cc3e53e1f6514730a329bd4745daef62 - Halo device variation
25. req_e39c20dc35fc9e2595374d06a5be27a5 - Halo device variation
26. req_ec35b087a2a84661a7d1adc719343335 - Halo device variation
27. req_f35ef320e6004b7eaa69178caf4fbc48 - Halo device variation
28. req_f97794b3b36f4825bf8bab6199d7762c - Halo device variation
29. req_fba177c0b3614b5b9303153f3481c159 - Halo device variation

### Successful Request IDs (Proving It CAN Work):

**These eventually passed (after retries or on first attempt):**
- African American child with superhero stickers - PASSED
- Chinese child with rainbow stickers - PASSED (after 2 rejections)

**All content identical to failed requests** - appropriate children's therapeutic imagery.

---

## The Issue:

**Your content moderation system has a bug:**
- Medical device + child context = false positive `[sexual]` tag
- Completely inappropriate categorization
- Inconsistent behavior (same prompt fails then passes)
- Harming legitimate therapeutic use case

**This is not user error** - this is a system training issue that needs OpenAI's attention.
