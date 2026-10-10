"""CourtIQ v234 basketball tactical taxonomy.

The taxonomy is intentionally broader than the current heuristic detectors.  A
concept can be `detectable`, `reviewable`, or `planned`: this lets the product
show the complete basketball language without pretending that every label can
already be proven from pixels.
"""
from __future__ import annotations

OFFENSE = {
    "restart": ["blob", "slob", "after_timeout", "free_throw_rebound"],
    "phase": ["transition", "early_offense", "halfcourt", "late_clock", "broken_play"],
    "primary_action": [
        "pick_and_roll", "pick_and_pop", "handoff", "isolation", "post_up",
        "drive", "cut", "off_ball_screen", "flare", "pin_down", "stagger",
        "elevator", "hammer", "screen_the_screener", "ghost_screen",
        "ram_screen", "spain_pnr", "horns", "five_out", "four_out_one_in",
        "empty_corner_pnr", "double_drag", "zoom", "chicago", "flex",
    ],
    "pnr_result": [
        "handler_drive", "handler_pullup", "handler_pass", "roll", "short_roll",
        "pop", "slip", "reject", "re_screen", "split", "snake",
    ],
    "shot_creation": [
        "rim", "paint", "midrange", "corner_three", "above_break_three",
        "catch_and_shoot", "pullup", "stepback", "post_finish",
    ],
}

DEFENSE = {
    "base": ["man", "zone_2_3", "zone_3_2", "zone_1_3_1", "matchup_zone", "box_and_one"],
    "pressure": ["full_court_press", "three_quarter_press", "half_court_press", "run_and_jump", "trap"],
    "pnr_coverage": [
        "drop", "switch", "ice", "under", "over", "hedge_show", "show_recover",
        "trap", "blitz", "at_level", "weak", "flat", "late_switch",
    ],
    "off_ball": [
        "top_lock", "lock_and_trail", "shoot_gap", "deny", "help_and_recover",
        "stunt", "tag_roll", "low_man_rotation", "x_out", "scram_switch",
        "peel_switch", "pre_switch",
    ],
    "rim": ["verticality", "rim_help", "charge_position", "no_middle", "funnel_middle"],
}

CONTEXT = {
    "result": ["made_2", "made_3", "miss", "turnover", "shooting_foul", "non_shooting_foul", "oreb", "dreb"],
    "quality": ["clean", "contested", "advantage", "neutral", "disadvantage", "broken"],
    "evidence": ["tracking", "ball_track", "court_map", "pbp_sync", "human_review"],
}

# Concepts produced by v234 heuristics when normalized player/ball tracks exist.
DETECTABLE_V234 = {
    "blob", "slob", "transition", "early_offense", "halfcourt",
    "pick_and_roll", "handoff", "isolation", "post_up", "cut",
    "off_ball_screen", "man", "zone_2_3", "zone_3_2", "zone_1_3_1",
    "full_court_press", "half_court_press", "trap",
    "drop", "switch", "ice", "under", "hedge_show",
    "help_and_recover", "tag_roll", "low_man_rotation",
}


def all_labels() -> set[str]:
    out: set[str] = set()
    for family in (OFFENSE, DEFENSE, CONTEXT):
        for labels in family.values():
            out.update(labels)
    return out


def capabilities() -> dict:
    labels = all_labels()
    return {
        "schema": "courtiq-basketball-taxonomy-v234",
        "total_labels": len(labels),
        "detectable": sorted(DETECTABLE_V234),
        "reviewable": sorted(labels - DETECTABLE_V234),
        "families": {"offense": OFFENSE, "defense": DEFENSE, "context": CONTEXT},
    }
