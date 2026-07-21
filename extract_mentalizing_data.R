# Extract participant-level tables from mentalizing experiment JSON exports.
#
# Produces:
#   df_fennimals         - one row per participant per fennimal (template)
#   df_timestamps        - one row per participant per phase timestamp
#   df_belief_phase      - one row per participant (belief block metadata)
#   df_belief_questions  - one row per participant per belief question mapping
#   df_belief_trials     - one row per trial; use `trial_kind` to subset
#   df_sorting_phase     - one row per participant (sorting block metadata)
#   df_sorting_errors    - one row per sorting error

suppressPackageStartupMessages({
  library(jsonlite)
  library(dplyr)
  library(purrr)
  library(tidyr)
})

# --- configuration -----------------------------------------------------------

json_path <- "c:/Users/Achiel/Downloads/mentalizing_completed_data (2).json"
belief_block_type <- "partner_belief_individual_boxes"
sorting_block_type <- "Fennimal_attribute_sorting_task"

# --- helpers -----------------------------------------------------------------

`%||%` <- function(x, y) if (is.null(x)) y else x

unwrap_json_scalar <- function(x) {
  if (is.null(x)) {
    return(NULL)
  }
  while (is.list(x) && !is.data.frame(x) && length(x) == 1) {
    x <- x[[1]]
  }
  if (is.data.frame(x) && nrow(x) == 1) {
    return(lapply(as.list(x[1, , drop = FALSE]), unwrap_json_scalar))
  }
  x
}

is_column_oriented_list <- function(x) {
  is.list(x) &&
    !is.data.frame(x) &&
    !is.null(names(x)) &&
    length(x) > 0 &&
    all(vapply(x, function(col) is.atomic(col) || is.null(col), logical(1)))
}

rebuild_trials_from_columns <- function(answers) {
  field_lens <- vapply(answers, function(col) {
    if (is.null(col)) 0L else length(col)
  }, integer(1))
  n <- max(field_lens)
  if (n == 0) {
    return(list())
  }

  lapply(seq_len(n), function(i) {
    trial <- lapply(answers, function(col) {
      if (is.null(col) || length(col) < i) {
        return(NULL)
      }
      unwrap_json_scalar(col[[i]])
    })
    names(trial) <- names(answers)
    trial
  })
}

answers_to_trials <- function(answers) {
  if (is.null(answers) || length(answers) == 0) {
    return(list())
  }

  if (is_column_oriented_list(answers)) {
    return(rebuild_trials_from_columns(answers))
  }

  # Normalize mixed list / data.frame representations into row records.
  if (!is.data.frame(answers)) {
    answers <- jsonlite::fromJSON(
      jsonlite::toJSON(answers, auto_unbox = TRUE, null = "null"),
      simplifyVector = TRUE
    )
  }

  if (is.data.frame(answers)) {
    return(lapply(seq_len(nrow(answers)), function(i) {
      row <- as.list(answers[i, , drop = FALSE])
      lapply(row, unwrap_json_scalar)
    }))
  }

  lapply(answers, function(trial) {
    if (is.data.frame(trial)) {
      lapply(as.list(trial[1, , drop = FALSE]), unwrap_json_scalar)
    } else {
      lapply(trial, unwrap_json_scalar)
    }
  })
}

json_field <- function(obj, name, default = NULL) {
  if (is.null(obj)) {
    return(default)
  }
  if (!is.list(obj) && !(is.atomic(obj) && !is.null(names(obj)))) {
    return(default)
  }
  if (!name %in% names(obj)) {
    return(default)
  }
  value <- unwrap_json_scalar(obj[[name]])
  if (is.null(value) || length(value) == 0) default else value
}

scalar_chr <- function(x, default = NA_character_) {
  if (is.null(x) || length(x) == 0) return(default)
  as.character(x[[1]])
}

scalar_int <- function(x, default = NA_integer_) {
  if (is.null(x) || length(x) == 0) return(default)
  as.integer(x[[1]])
}

scalar_dbl <- function(x, default = NA_real_) {
  if (is.null(x) || length(x) == 0) return(default)
  as.numeric(x[[1]])
}

scalar_lgl <- function(x, default = NA) {
  if (is.null(x) || length(x) == 0) return(default)
  as.logical(x[[1]])
}

as_record_list <- function(x) {
  if (is.null(x) || length(x) == 0) {
    return(list())
  }
  if (is.data.frame(x)) {
    return(lapply(seq_len(nrow(x)), function(i) {
      lapply(as.list(x[i, , drop = FALSE]), unwrap_json_scalar)
    }))
  }
  if (is_column_oriented_list(x)) {
    return(rebuild_trials_from_columns(x))
  }
  x
}

read_participants <- function(path) {
  fromJSON(path, simplifyVector = FALSE)
}

get_stored_block <- function(participant, position) {
  blocks <- participant$storedData %||% list()
  n <- length(blocks)
  if (n == 0) {
    return(NULL)
  }

  # R's `[[` treats negative indices as exclusion, not "from the end" (unlike Python).
  # Convert -1 -> last, -2 -> penultimate, etc.
  idx <- if (position < 0) n + position + 1 else position
  if (idx < 1 || idx > n) {
    return(NULL)
  }

  blocks[[idx]]
}

collapse_chr <- function(x, sep = ";") {
  if (is.null(x) || length(x) == 0) {
    return(NA_character_)
  }
  paste(x, collapse = sep)
}

extract_fennimals <- function(participants) {
  map_dfr(participants, function(p) {
    fennimals <- p$fennimals %||% list()
    if (length(fennimals) == 0) {
      return(tibble(pid = p$pid))
    }

    bind_cols(tibble(pid = p$pid), bind_rows(fennimals))
  })
}

extract_timestamps <- function(participants) {
  map_dfr(participants, function(p) {
    stamps <- p$timeStamps %||% list()
    if (length(stamps) == 0) {
      return(tibble(pid = p$pid))
    }

    bind_cols(tibble(pid = p$pid), bind_rows(stamps))
  })
}

flatten_trial_options <- function(options) {
  options <- unwrap_json_scalar(options)

  if (is.null(options) || length(options) == 0) {
    return(tibble())
  }

  if (is.data.frame(options)) {
    opts <- options
  } else {
    options <- as_record_list(options)
    if (length(options) == 0) {
      return(tibble())
    }
    opts <- bind_rows(options)
  }

  if (nrow(opts) == 0) {
    return(tibble())
  }

  if ("role" %in% names(opts)) {
    opts$role <- vapply(opts$role, scalar_chr, character(1), USE.NAMES = FALSE)
  }
  if ("id" %in% names(opts)) {
    opts$id <- vapply(opts$id, scalar_chr, character(1), USE.NAMES = FALSE)
  }

  role_cols <- opts %>%
    mutate(
      col_name = paste0("option_", .data$role),
      value = if ("id" %in% names(opts)) .data$id else NA_character_
    ) %>%
    select(col_name, value) %>%
    pivot_wider(
      names_from = col_name,
      values_from = value,
      values_fn = list(value = dplyr::first)
    )

  shape_cols <- if ("shape" %in% names(opts)) {
    opts %>%
      filter(!is.na(.data$shape)) %>%
      mutate(col_name = paste0("option_", .data$role, "_shape")) %>%
      select(col_name, shape) %>%
      pivot_wider(
        names_from = col_name,
        values_from = shape,
        values_fn = list(shape = dplyr::first)
      )
  } else {
    tibble()
  }

  color_cols <- if ("color_id" %in% names(opts)) {
    opts %>%
      filter(!is.na(.data$color_id)) %>%
      mutate(col_name = paste0("option_", .data$role, "_color_id")) %>%
      select(col_name, color_id) %>%
      pivot_wider(
        names_from = col_name,
        values_from = color_id,
        values_fn = list(color_id = dplyr::first)
      )
  } else {
    tibble()
  }

  bind_cols(role_cols, shape_cols, color_cols)
}

extract_belief_phase <- function(participants) {
  map_dfr(participants, function(p) {
    block <- get_stored_block(p, -2)
    if (is.null(block)) {
      return(tibble(pid = p$pid))
    }

    if (!identical(block$type, belief_block_type)) {
      warning(
        sprintf(
          "Participant %s: expected penultimate block '%s', got '%s'",
          p$pid,
          belief_block_type,
          block$type %||% "<missing>"
        ),
        call. = FALSE
      )
    }

    tibble(
      pid = p$pid,
      phase_type = block$type %||% NA_character_,
      phasenum = block$phasenum %||% NA_integer_,
      num_belief_blocks = block$num_belief_blocks %||% NA_integer_,
      include_practice_trial = block$include_practice_trial %||% NA,
      include_reality_block_at_end = block$include_reality_block_at_end %||% NA,
      bonus_stars_earned = block$bonus_stars_earned %||% NA_real_,
      bonus_stars_per_correct_answer = block$bonus_stars_per_correct_answer %||% NA_real_,
      n_trials = length(answers_to_trials(block$answers %||% list()))
    )
  })
}

extract_belief_questions <- function(participants) {
  map_dfr(participants, function(p) {
    block <- get_stored_block(p, -2)
    questions <- as_record_list(block$questions %||% list())
    if (length(questions) == 0) {
      return(tibble(pid = p$pid))
    }

    bind_cols(tibble(pid = p$pid), bind_rows(questions))
  })
}

extract_belief_trials <- function(participants) {
  map_dfr(participants, function(p) {
    block <- get_stored_block(p, -2)
    if (is.null(block)) {
      return(tibble(pid = p$pid))
    }

    answers <- answers_to_trials(block$answers %||% list())
    if (length(answers) == 0) {
      return(tibble(pid = p$pid))
    }

    map_dfr(seq_along(answers), function(i) {
      trial <- answers[[i]]
      target <- json_field(trial, "target")
      option_cols <- flatten_trial_options(json_field(trial, "options"))

      row <- tibble(
        pid = p$pid,
        trial_row = i,
        trial_index = scalar_int(json_field(trial, "trial_index", NA_integer_)),
        trial_kind = scalar_chr(json_field(trial, "trial_kind", NA_character_)),
        question_id = scalar_chr(json_field(trial, "question_id", NA_character_)),
        block_index = scalar_int(json_field(trial, "block_index", NA_integer_)),
        reaction_time_ms = scalar_dbl(json_field(trial, "reaction_time_ms", NA_real_)),
        correct = scalar_lgl(json_field(trial, "correct", NA)),
        selected = scalar_chr(json_field(trial, "selected", NA_character_)),
        match_rule = scalar_chr(json_field(trial, "match_rule", NA_character_)),
        target_box = scalar_chr(json_field(trial, "target_box", NA_character_)),
        target_shape = scalar_chr(json_field(target, "shape", NA_character_)),
        target_color_id = scalar_chr(json_field(target, "color_id", NA_character_))
      )

      # bind_cols drops rows when option_cols has 0 rows but columns (common for belief trials).
      if (ncol(option_cols) == 0 || nrow(option_cols) == 0) {
        row
      } else {
        bind_cols(row, option_cols)
      }
    })
  })
}

extract_sorting_phase <- function(participants) {
  map_dfr(participants, function(p) {
    block <- get_stored_block(p, -1)
    if (is.null(block)) {
      return(tibble(pid = p$pid))
    }

    if (!identical(block$type, sorting_block_type)) {
      warning(
        sprintf(
          "Participant %s: expected last block '%s', got '%s'",
          p$pid,
          sorting_block_type,
          block$type %||% "<missing>"
        ),
        call. = FALSE
      )
    }

    tibble(
      pid = p$pid,
      phase_type = block$type %||% NA_character_,
      phasenum = block$phasenum %||% NA_integer_,
      presentation = block$presentation %||% NA_character_,
      maximum_earnable_stars = block$maximum_earnable_stars %||% NA_real_,
      bonus_stars_earned = block$bonus_stars_earned %||% NA_real_,
      attribute_order = collapse_chr(block$attribute_order),
      fennimals_encountered = collapse_chr(block$Fennimals_encountered),
      n_errors = length(block$Errors %||% list())
    )
  })
}

extract_sorting_errors <- function(participants) {
  map_dfr(participants, function(p) {
    block <- get_stored_block(p, -1)
    errors <- as_record_list(block$Errors %||% list())
    if (length(errors) == 0) {
      return(tibble())
    }

    bind_cols(
      tibble(pid = p$pid, error_row = seq_along(errors)),
      bind_rows(errors)
    )
  })
}

# --- run ---------------------------------------------------------------------

participants <- read_participants(json_path)

df_fennimals <- extract_fennimals(participants)
df_timestamps <- extract_timestamps(participants)
df_belief_phase <- extract_belief_phase(participants)
df_belief_questions <- extract_belief_questions(participants)
df_belief_trials <- extract_belief_trials(participants)
df_sorting_phase <- extract_sorting_phase(participants)
df_sorting_errors <- extract_sorting_errors(participants)

# Quick sanity checks
cat("Participants:", length(participants), "\n")
cat("Fennimals rows:", nrow(df_fennimals), "\n")
cat("Timestamp rows:", nrow(df_timestamps), "\n")
cat("Belief phase rows:", nrow(df_belief_phase), "\n")
cat("Belief question rows:", nrow(df_belief_questions), "\n")
cat("Belief trial rows:", nrow(df_belief_trials), "\n")
cat("Sorting phase rows:", nrow(df_sorting_phase), "\n")
cat("Sorting error rows:", nrow(df_sorting_errors), "\n")
cat("\nBelief trial kinds:\n")
print(df_belief_trials %>% count(trial_kind, sort = TRUE))

# Example subsets:
# belief_only <- df_belief_trials %>% filter(trial_kind == "belief")
# reality_only <- df_belief_trials %>% filter(trial_kind == "reality")
# test_trials <- df_belief_trials %>% filter(trial_kind %in% c("belief", "reality"))
