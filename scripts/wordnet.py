"""Offline: expand each theme with WordNet hyponyms -> data/wordnet.json.
Run once: pip install nltk wordfreq && python scripts/wordnet.py
"""
import json
import nltk
from nltk.corpus import wordnet as wn
from wordfreq import zipf_frequency

nltk.download("wordnet", quiet=True)

# theme name -> WordNet root synsets (everything below them is accepted)
ROOTS = {
    "Animals": ["animal.n.01"],
    "Foods": ["food.n.01", "food.n.02", "beverage.n.01", "dish.n.02"],
    "Sports": ["sport.n.01", "athletic_game.n.01"],
    "Colours": ["color.n.01"],
    "Body parts": ["body_part.n.01", "organ.n.01"],
    "Musical instruments": ["musical_instrument.n.01"],
    "Weather": ["weather.n.01", "atmospheric_phenomenon.n.01"],
    "Tools": ["tool.n.01"],
    "Clothing": ["clothing.n.01", "garment.n.01"],
    "Trees & plants": ["tree.n.01", "flower.n.01", "shrub.n.01", "herb.n.01"],
    "Birds": ["bird.n.01"],
    "Ocean life": ["fish.n.01", "mollusk.n.01", "crustacean.n.01", "cetacean.n.01", "coelenterate.n.01"],
    "Furniture & home": ["furniture.n.01", "home_appliance.n.01"],
    "Gemstones & metals": ["gem.n.02", "metal.n.01", "mineral.n.01"],
    "Kitchen items": ["kitchen_utensil.n.01", "cutlery.n.02", "cooking_utensil.n.01", "tableware.n.01"],
    "Desserts": ["dessert.n.01", "sweet.n.03"],
    "Space": ["celestial_body.n.01", "constellation.n.01"],
    "Countries": ["country.n.02"],
    "Rivers & seas": ["river.n.01", "sea.n.01", "ocean.n.01", "lake.n.01"],
    "Professions": ["professional.n.01", "skilled_worker.n.01", "craftsman.n.03"],
}

# generic words WordNet files under these roots that a player wouldn't call a member
EXCLUDE = {
    "Animals": "young male female adult baby man woman person human child people homo sapiens mammal bird fish insect animal pet game fauna",
    "Foods": "food nutrient meal course dish produce fare meat",
    "Sports": "sport game contest",
    "Colours": "color colour",
    "Body parts": "part organ",
    "Tools": "tool implement",
    "Clothing": "clothing garment clothes",
    "Professions": "professional worker person man woman skilled",
}

def lemmas(name):
    root = wn.synset(name)
    out = set()
    for s in [root, *root.closure(lambda x: x.hyponyms())]:
        for l in s.lemma_names():
            if l.isalpha() and l.islower() and 3 <= len(l) <= 14:
                out.add(l)
    return out

data = {}
for theme, roots in ROOTS.items():
    words = set()
    for r in roots:
        words |= lemmas(r)
    words -= set(EXCLUDE.get(theme, "").split())
    common = sorted(w for w in words if zipf_frequency(w, "en") >= 3.3)
    data[theme] = {"all": sorted(words), "common": common}
    print(f"{theme:22} all={len(words):5} common={len(common):4}")

json.dump(data, open("data/wordnet.json", "w"))
