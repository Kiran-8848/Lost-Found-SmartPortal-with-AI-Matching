"""
AI Smart Matching Module - FIXED VERSION
Uses TF-IDF text similarity, category matching, location proximity, and date proximity
to find potential matches between lost and found items.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import re


class SmartMatcher:
    """AI-powered matching engine for lost and found items"""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
        )

    def preprocess_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        text = str(text).lower().strip()
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def calculate_text_similarity(self, text1, text2):
        """Calculate cosine similarity between two texts using TF-IDF"""
        try:
            text1 = self.preprocess_text(text1)
            text2 = self.preprocess_text(text2)

            if not text1 or not text2:
                return 0.0

            # Check for common words first
            words1 = set(text1.split())
            words2 = set(text2.split())
            common_words = words1.intersection(words2)

            # Remove very common words
            stop_words = {"a", "an", "the", "is", "it", "in", "on", "at", "to", "for",
                          "of", "and", "or", "my", "i", "was", "with", "has", "have",
                          "near", "found", "lost", "item", "the"}
            meaningful_common = common_words - stop_words

            # Word overlap score
            if len(words1) == 0 or len(words2) == 0:
                word_overlap = 0.0
            else:
                word_overlap = len(meaningful_common) / min(len(words1), len(words2))

            # TF-IDF cosine similarity
            try:
                tfidf_matrix = self.vectorizer.fit_transform([text1, text2])
                cosine_sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
            except Exception:
                cosine_sim = 0.0

            # Combine both methods - take the higher score
            final_score = max(cosine_sim, word_overlap)

            print(f"    [TEXT] TF-IDF: {cosine_sim:.2f}, Word Overlap: {word_overlap:.2f}, "
                  f"Common: {meaningful_common}, Final: {final_score:.2f}")

            return final_score

        except Exception as e:
            print(f"    [TEXT ERROR] {e}")
            return 0.0

    def calculate_category_match(self, category1, category2):
        """Check if categories match"""
        if not category1 or not category2:
            return 0.0

        cat1 = str(category1).lower().strip()
        cat2 = str(category2).lower().strip()

        if cat1 == cat2:
            print(f"    [CATEGORY] Exact match: {cat1} = {cat2} -> 1.0")
            return 1.0

        # Partial match (e.g., "electronics" vs "electronic")
        if cat1 in cat2 or cat2 in cat1:
            print(f"    [CATEGORY] Partial match: {cat1} ~ {cat2} -> 0.7")
            return 0.7

        print(f"    [CATEGORY] No match: {cat1} != {cat2} -> 0.0")
        return 0.0

    def calculate_location_similarity(self, location1, location2):
        """Calculate location similarity based on text matching"""
        loc1 = self.preprocess_text(location1)
        loc2 = self.preprocess_text(location2)

        if not loc1 or not loc2:
            return 0.0

        # Exact match
        if loc1 == loc2:
            print(f"    [LOCATION] Exact match -> 1.0")
            return 1.0

        # Word overlap
        words1 = set(loc1.split())
        words2 = set(loc2.split())

        # Remove common stop words for location
        loc_stop = {"the", "a", "an", "at", "in", "on", "near", "by", "of"}
        words1 = words1 - loc_stop
        words2 = words2 - loc_stop

        if not words1 or not words2:
            return 0.3

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        jaccard = len(intersection) / len(union) if union else 0

        # Also check if one contains words from the other
        containment = len(intersection) / min(len(words1), len(words2)) if min(len(words1), len(words2)) > 0 else 0

        score = max(jaccard, containment)
        print(f"    [LOCATION] Words1: {words1}, Words2: {words2}, "
              f"Common: {intersection}, Score: {score:.2f}")

        return score

    def calculate_date_proximity(self, date1_str, date2_str, max_days=30):
        """Calculate date proximity score"""
        try:
            # Handle multiple date formats
            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    date1 = datetime.strptime(str(date1_str).split("T")[0], "%Y-%m-%d")
                    break
                except ValueError:
                    continue
            else:
                return 0.5

            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    date2 = datetime.strptime(str(date2_str).split("T")[0], "%Y-%m-%d")
                    break
                except ValueError:
                    continue
            else:
                return 0.5

            diff = abs((date1 - date2).days)

            if diff == 0:
                score = 1.0
            elif diff <= 3:
                score = 0.9
            elif diff <= 7:
                score = 0.7
            elif diff <= max_days:
                score = 1.0 - (diff / max_days)
            else:
                score = 0.1

            print(f"    [DATE] Date1: {date1_str}, Date2: {date2_str}, "
                  f"Diff: {diff} days, Score: {score:.2f}")
            return score

        except (ValueError, TypeError) as e:
            print(f"    [DATE ERROR] {e}")
            return 0.5

    def calculate_match_score(self, item1, item2):
        """
        Calculate overall match score between two items.
        Returns a weighted score between 0 and 100.
        """
        print(f"\n  Comparing: '{item1.get('name', '')}' vs '{item2.get('name', '')}'")

        # Combine name and description for text comparison
        text1 = f"{item1.get('name', '')} {item1.get('description', '')}"
        text2 = f"{item2.get('name', '')} {item2.get('description', '')}"

        # Individual scores
        text_score = self.calculate_text_similarity(text1, text2)
        category_score = self.calculate_category_match(
            item1.get("category", ""), item2.get("category", "")
        )
        location_score = self.calculate_location_similarity(
            item1.get("location", ""), item2.get("location", "")
        )
        date_score = self.calculate_date_proximity(
            item1.get("date_occurred", ""), item2.get("date_occurred", "")
        )

        # Weighted combination
        weights = {
            "text": 0.35,
            "category": 0.30,
            "location": 0.20,
            "date": 0.15,
        }

        total_score = (
            text_score * weights["text"]
            + category_score * weights["category"]
            + location_score * weights["location"]
            + date_score * weights["date"]
        )

        result = {
            "total_score": round(total_score * 100, 2),
            "text_similarity": round(text_score * 100, 2),
            "category_match": round(category_score * 100, 2),
            "location_similarity": round(location_score * 100, 2),
            "date_proximity": round(date_score * 100, 2),
        }

        print(f"    [TOTAL] Text:{result['text_similarity']}% "
              f"Cat:{result['category_match']}% "
              f"Loc:{result['location_similarity']}% "
              f"Date:{result['date_proximity']}% "
              f"= {result['total_score']}%")

        return result

    def find_matches(self, new_item, candidate_items, threshold=15.0, max_results=20):
        """
        Find matching items for a newly posted item.

        Args:
            new_item: The newly posted item
            candidate_items: List of items to compare against
            threshold: Minimum score to consider a match (0-100) - LOWERED to 15
            max_results: Maximum number of matches to return

        Returns:
            List of matches sorted by score (highest first)
        """
        matches = []

        new_item_id = str(new_item.get("_id", ""))
        new_item_user = new_item.get("user_id", "")

        print(f"\n{'='*60}")
        print(f"SMART MATCHING for: {new_item.get('name', 'Unknown')}")
        print(f"Type: {new_item.get('item_type', 'unknown')}")
        print(f"Category: {new_item.get('category', 'unknown')}")
        print(f"Location: {new_item.get('location', 'unknown')}")
        print(f"Candidates to check: {len(candidate_items)}")
        print(f"Threshold: {threshold}%")
        print(f"{'='*60}")

        if len(candidate_items) == 0:
            print("NO CANDIDATES FOUND - Need items of opposite type!")
            print(f"  This item is: {new_item.get('item_type', 'unknown')}")
            opposite = "found" if new_item.get("item_type") == "lost" else "lost"
            print(f"  Looking for: {opposite} items")
            print(f"  -> Post some {opposite} items first!")
            return []

        for candidate in candidate_items:
            candidate_id = str(candidate.get("_id", ""))

            # Skip same item
            if candidate_id == new_item_id:
                continue

            # Skip same user (optional - remove this if testing with same account)
            # if candidate.get("user_id") == new_item_user:
            #     print(f"  Skipping own item: {candidate.get('name', '')}")
            #     continue

            # Skip resolved items
            if candidate.get("is_resolved", False):
                continue

            score_details = self.calculate_match_score(new_item, candidate)

            if score_details["total_score"] >= threshold:
                matches.append(
                    {
                        "item_id": candidate_id,
                        "item_name": candidate.get("name", ""),
                        "item_type": candidate.get("item_type", ""),
                        "category": candidate.get("category", ""),
                        "location": candidate.get("location", ""),
                        "date_occurred": candidate.get("date_occurred", ""),
                        "description": candidate.get("description", ""),
                        "image": candidate.get("image", ""),
                        "username": candidate.get("username", ""),
                        "user_id": candidate.get("user_id", ""),
                        "score": score_details,
                    }
                )
                print(f"  >>> MATCH FOUND! Score: {score_details['total_score']}%")
            else:
                print(f"  --- Below threshold ({score_details['total_score']}% < {threshold}%)")

        # Sort by total score descending
        matches.sort(key=lambda x: x["score"]["total_score"], reverse=True)

        print(f"\n TOTAL MATCHES: {len(matches)} (showing top {max_results})")
        print(f"{'='*60}\n")

        return matches[:max_results]


# Global matcher instance
smart_matcher = SmartMatcher()