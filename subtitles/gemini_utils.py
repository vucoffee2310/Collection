import os
import re
import io # For StringIO
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Core Helper Functions --- (Unchanged)
def count_non_whitespace_threshold(text_source, start_idx, end_idx, threshold):
    """
    Checks if 'threshold' non-whitespace characters exist in text_source[start_idx:end_idx].
    Returns (True, count_at_stop_or_total)
    - True if threshold is met, count_at_stop_or_total will be >= threshold.
    - False if threshold is not met, count_at_stop_or_total will be the total found.
    """
    count = 0
    effective_end_idx = min(end_idx, len(text_source))
    for i in range(start_idx, effective_end_idx):
        if not text_source[i].isspace():
            count += 1
        if count >= threshold:
            return True, count # Threshold met
    return False, count # Threshold not met

def extract_n_non_whitespace(text_source, n_chars_to_extract, from_start=True):
    if not text_source or n_chars_to_extract <= 0: return ""
    if from_start:
        buffer = []; nw_count = 0
        for char in text_source:
            buffer.append(char)
            if not char.isspace(): nw_count += 1
            if nw_count == n_chars_to_extract: break
        return "".join(buffer)
    else:
        nw_count = 0; start_idx_segment = len(text_source)
        for i in range(len(text_source) - 1, -1, -1):
            start_idx_segment = i
            if not text_source[i].isspace(): nw_count += 1
            if nw_count == n_chars_to_extract: break
        if nw_count < n_chars_to_extract and nw_count > 0: start_idx_segment = 0
        elif nw_count == 0: return ""
        return text_source[start_idx_segment:]

# --- Refactored Helper Functions --- (Unchanged)
def _determine_pair_processing_rules(k, num_total_pairs, p2_is_empty_str):
    is_first_pair = (k == 0); is_last_pair_in_list = (k == num_total_pairs - 1)
    rule = {'needs_before_check': False, 'needs_after_check': False, 'is_deferred_write': False, 'rule_type': ''}
    # Rule: The "before" check is skipped only for the very first pair in the target_pairs list.
    # If an earlier pair is skipped due to out-of-order finding, a later pair might become
    # the effectively "first found pair", but its 'before' check relative to text start (idx 0)
    # is still relevant based on its position k in the original list.
    # The original logic for 'is_first_pair' should determine if a 'before' check is conceptually needed.
    # The actual 'before' content length depends on where its p1 is found.

    actual_first_pair_found_so_far = True # Assume true until a pair is found
    # This needs to be dynamic or we simplify: always check 'before' unless k=0.
    # The original logic:
    if is_first_pair: # This refers to k=0, the first pair in the target_pairs list definition
        rule['needs_after_check'] = True; rule['rule_type'] = 'first'
        # No 'needs_before_check = True' implies it's false by default.
    elif is_last_pair_in_list and p2_is_empty_str:
        rule['needs_before_check'] = True; rule['is_deferred_write'] = True; rule['rule_type'] = 'last_special'
    else: # Middle pairs
        rule['needs_before_check'] = True; rule['needs_after_check'] = True; rule['rule_type'] = 'middle'
    return rule

def _extract_segments_for_output(rule_type, p1, p2, idx1, idx2_conceptual,
                                 full_text_content, req_nw):
    segments = {'before': "", 'key1': p1, 'between': "", 'key2': p2 if p2 else "", 'after': ""}
    if rule_type == 'first':
        # 'before' content for the first rule (k=0) is implicitly empty or not required by threshold
        segments['between'] = full_text_content[idx1 + len(p1) : idx2_conceptual]
        segments['after'] = extract_n_non_whitespace(full_text_content[idx2_conceptual + len(p2):], req_nw, from_start=True)
    elif rule_type == 'last_special':
        segments['before'] = extract_n_non_whitespace(full_text_content[0:idx1], req_nw, from_start=False)
        segments['between'] = full_text_content[idx1 + len(p1):] # Captures till end of full_text_content
    elif rule_type == 'middle':
        segments['before'] = extract_n_non_whitespace(full_text_content[0:idx1], req_nw, from_start=False)
        segments['between'] = full_text_content[idx1 + len(p1) : idx2_conceptual]
        segments['after'] = extract_n_non_whitespace(full_text_content[idx2_conceptual + len(p2):], req_nw, from_start=True)
    return segments

def _write_pair_data_to_file(segments_dict, p1_key, p2_key, output_dir):
    pair_filename_p2_part = p2_key if p2_key else "end"
    safe_p1 = re.sub(r'[^\w_.)( -]', '', p1_key); safe_p2_part = re.sub(r'[^\w_.)( -]', '', pair_filename_p2_part)
    individual_filename = f"qualified_pair_{safe_p1}_to_{safe_p2_part}.txt"
    full_output_path = os.path.join(output_dir, individual_filename)
    output_content = (f"BEFORE_CONTENT:\n{segments_dict['before']}\n\nKEY1:\n{segments_dict['key1']}\n\n"
                      f"CONTENT_BETWEEN:\n{segments_dict['between']}\n\nKEY2:\n{segments_dict['key2']}\n\n"
                      f"AFTER_CONTENT:\n{segments_dict['after']}")
    with open(full_output_path, "w", encoding="utf-8") as pair_file: pair_file.write(output_content)
    print(f"  >> Saved details to '{full_output_path}'")

# --- Main Function with Modified Logic ---
def generate_and_save(input_text, output_filename_base, api_key):
    if not api_key: print("Error: GEMINI_API_KEY not provided."); return
    try: client = genai.Client(api_key=api_key)
    except Exception as e: print(f"Error initializing Google GenAI Client: {e}"); return

    model_name = "gemini-2.5-flash-preview-05-20"
    gen_contents = [types.Content(role="user", parts=[types.Part.from_text(text=input_text)])]
    gen_config = types.GenerateContentConfig(
        temperature=1.5, top_p=0.5, candidateCount=1, maxOutputTokens=65000,
        thinking_config=types.ThinkingConfig(thinking_budget=500), response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")],
    )

    print(f"Starting content generation for input (first 50 chars): '{input_text[:50]}...'")
    stream_output_file = f"{output_filename_base}_stream.txt"; print(f"Full stream will be saved to '{stream_output_file}'")
    
    cumulative_text_buffer = io.StringIO()
    current_cumulative_len = 0

    target_pairs = [
        ('2f8e', '09e5'), ('09e5', 'ddc7'), ('ddc7', '29t9'),
        ('29t9', '56ca'), ('56ca', '6f36'), ('6f36', ''),
    ]
    REQUIRED_NON_WHITESPACE = 150 # Keep original requirement
    OFFSET_CHARS_FOR_NEXT_SEARCH = 250 # For constraint 1
    output_pairs_dir = "output_pairs_data"; os.makedirs(output_pairs_dir, exist_ok=True)

    # State for each pair
    pair_search_states = {
        pair_keys: {
            'idx1': -1, 
            'idx2_conceptual': -1, 
            'file_written_or_deferred': False,
            'before_threshold_met': False,
            'after_threshold_met': False,
            'after_segment_start_idx': -1,
            'actual_before_count': 0,
            'actual_after_count': 0,
            'permanently_skipped': False, # MODIFIED: For Constraint 2
        }
        for pair_keys in target_pairs
    }
    last_pair_deferred_info = None
    current_search_start_index_for_p1 = 0 # MODIFIED: For Constraint 1

    try:
        with open(stream_output_file, "w", encoding="utf-8") as f_stream:
            stream = client.models.generate_content_stream(model=model_name, contents=gen_contents, config=gen_config) # Updated API call
            for chunk_num, chunk in enumerate(stream):
                if not hasattr(chunk, 'text') or not chunk.text: continue # Ensure chunk.text exists
                
                chunk_text = chunk.text
                f_stream.write(chunk_text)
                cumulative_text_buffer.write(chunk_text)
                current_cumulative_len += len(chunk_text)
                
                full_cumulative_text_str = cumulative_text_buffer.getvalue()
                print(f"\n--- Chunk {chunk_num+1} received (new length: {current_cumulative_len}, p1 search starts from: {current_search_start_index_for_p1}) ---")

                for k, (p1, p2) in enumerate(target_pairs):
                    state = pair_search_states[(p1, p2)]
                    pair_key_tuple = (p1, p2) # For easier use in prints

                    if state['permanently_skipped']: # If skipped, do nothing further for this pair
                        continue
                    if state['file_written_or_deferred']: # If already processed and saved/deferred
                        continue

                    # --- Key Finding ---
                    if state['idx1'] == -1:
                        # MODIFIED: Use current_search_start_index_for_p1
                        found_idx1 = full_cumulative_text_str.find(p1, current_search_start_index_for_p1)
                        if found_idx1 != -1:
                            state['idx1'] = found_idx1
                            print(f"  Found p1='{p1}' for pair {pair_key_tuple} at {state['idx1']} (searched from index {current_search_start_index_for_p1})")
                            
                            # MODIFIED: Constraint 2 - Check for skipping earlier unfound pairs
                            for j_skip in range(k): # Iterate through pairs before the current one
                                prev_pair_keys_tuple = target_pairs[j_skip]
                                prev_state = pair_search_states[prev_pair_keys_tuple]
                                if prev_state['idx1'] == -1 and not prev_state['permanently_skipped']:
                                    prev_state['permanently_skipped'] = True
                                    # Mark as 'processed' to prevent threshold checks etc.
                                    # We don't set file_written_or_deferred as it implies a valid find
                                    print(f"  INFO: Pair {prev_pair_keys_tuple} was not found before pair {pair_key_tuple} (p1='{p1}' found). "
                                          f"Permanently skipping {prev_pair_keys_tuple}.")
                        # else: p1 not found in this chunk from current_search_start_index_for_p1
                    
                    if state['idx1'] != -1 and state['idx2_conceptual'] == -1: # p1 is found, look for p2
                        search_p2_from = state['idx1'] + len(p1)
                        if p2: # If p2 is a non-empty string
                            found_idx2_actual = full_cumulative_text_str.find(p2, search_p2_from)
                            if found_idx2_actual != -1:
                                state['idx2_conceptual'] = found_idx2_actual
                                state['after_segment_start_idx'] = found_idx2_actual + len(p2)
                                print(f"  Found p2='{p2}' for pair {pair_key_tuple} at {state['idx2_conceptual']} (searched from {search_p2_from})")
                                
                                # MODIFIED: Constraint 1 - Update search start for NEXT pair
                                content_between_start_idx = state['idx1'] + len(p1)
                                content_between_end_idx = state['idx2_conceptual']
                                content_between_len = content_between_end_idx - content_between_start_idx
                                offset_in_between = max(0, content_between_len - OFFSET_CHARS_FOR_NEXT_SEARCH)
                                current_search_start_index_for_p1 = content_between_start_idx + offset_in_between
                                print(f"    Updated global p1 search start for subsequent pairs to: {current_search_start_index_for_p1} (based on pair {pair_key_tuple})")
                        else: # p2 is an empty string (typically for the last pair)
                            state['idx2_conceptual'] = state['idx1'] + len(p1) # Conceptual end is right after p1
                            # For 'last_special', 'needs_after_check' is false, so after_segment_start_idx might not be strictly needed for it.
                            # However, if a non-last pair had empty p2 and needs_after_check, this would be used.
                            state['after_segment_start_idx'] = state['idx2_conceptual'] # Start of "after" is immediately after p1

                            print(f"  p2 is empty for pair {pair_key_tuple}, conceptual_end at {state['idx2_conceptual']}")
                            
                            # MODIFIED: Constraint 1 - Update search start for NEXT pair
                            # For empty p2, content_between for calculating next search start is considered zero length
                            # because p2 is conceptually right after p1.
                            new_search_start = state['idx1'] + len(p1)
                            current_search_start_index_for_p1 = new_search_start
                            print(f"    Updated global p1 search start for subsequent pairs to: {current_search_start_index_for_p1} (based on pair {pair_key_tuple} with empty p2)")
                    
                    # --- If keys for this pair are not yet fully found, continue to next pair or next chunk ---
                    idx1 = state['idx1']
                    idx2_conceptual = state['idx2_conceptual']
                    if idx1 == -1 or idx2_conceptual == -1:
                        continue 
                    
                    # --- Proceed only if this pair's keys are found and it's not skipped ---
                    pair_found_in_order = (idx1 != -1) and ((not p2) or (p2 and idx2_conceptual > idx1)) # Basic sanity
                    if not pair_found_in_order : continue # Should be caught by idx2_conceptual == -1 check if p2 search fails after p1

                    pair_display_name = f"('{p1}', '{p2 if p2 else '<END>'}')"
                    rule = _determine_pair_processing_rules(k, len(target_pairs), not p2)
                    
                    met_before_overall, met_after_overall = True, True 

                    if rule['needs_before_check'] and not state['before_threshold_met']:
                        met_this_check, count = count_non_whitespace_threshold(
                            full_cumulative_text_str, 0, idx1, REQUIRED_NON_WHITESPACE
                        )
                        state['actual_before_count'] = count 
                        if met_this_check: state['before_threshold_met'] = True
                    
                    if rule['needs_before_check']: met_before_overall = state['before_threshold_met']

                    if rule['needs_after_check'] and state['after_segment_start_idx'] != -1 and \
                       not state['after_threshold_met']:
                        met_this_check, count = count_non_whitespace_threshold(
                            full_cumulative_text_str, 
                            state['after_segment_start_idx'], 
                            current_cumulative_len, 
                            REQUIRED_NON_WHITESPACE
                        )
                        state['actual_after_count'] = count
                        if met_this_check: state['after_threshold_met'] = True

                    if rule['needs_after_check']: met_after_overall = state['after_threshold_met']

                    before_report = state['actual_before_count'] if rule['needs_before_check'] else 'N/A'
                    after_report = state['actual_after_count'] if rule['needs_after_check'] else 'N/A'
                    print(f"  {pair_display_name}: Rule '{rule['rule_type']}'. "
                          f"Counts: Before({before_report}), After({after_report}). "
                          f"Met: Before({state['before_threshold_met'] if rule['needs_before_check'] else 'N/A'}), "
                          f"After({state['after_threshold_met'] if rule['needs_after_check'] else 'N/A'})")

                    current_pair_conditions_met = met_before_overall and met_after_overall

                    if current_pair_conditions_met:
                        state['file_written_or_deferred'] = True # Mark as processed
                        if rule['is_deferred_write']:
                            print(f"\n!!! LAST PAIR {pair_display_name} CONDITIONALLY QUALIFIED - File will be generated at stream end. !!!")
                            last_pair_deferred_info = {'p1': p1, 'p2': p2, 'idx1': idx1, 'rule_type': rule['rule_type']}
                        else:
                            print(f"\n!!! QUALIFIED PAIR: {pair_display_name} - Conditions met. Saving. !!!")
                            segments = _extract_segments_for_output(
                                rule['rule_type'], p1, p2, idx1, idx2_conceptual,
                                full_cumulative_text_str, REQUIRED_NON_WHITESPACE
                            )
                            _write_pair_data_to_file(segments, p1, p2, output_pairs_dir)
        
        # After stream processing
        full_final_text_str = cumulative_text_buffer.getvalue()
        if last_pair_deferred_info: # This will only be true if the last pair wasn't skipped and met conditions
            info = last_pair_deferred_info
            # Ensure it wasn't subsequently marked as skipped (though current logic should prevent this state)
            if not pair_search_states[(info['p1'], info['p2'])]['permanently_skipped']:
                print(f"\n--- Processing PENDING last pair ('{info['p1']}', '{info['p2'] if info['p2'] else '<END>'}') after stream completion ---")
                # For deferred last pair with empty p2, idx2_conceptual was idx1 + len(p1).
                # The 'between' segment extraction for 'last_special' rule handles going to end of text.
                segments = _extract_segments_for_output(
                    info['rule_type'], info['p1'], info['p2'], info['idx1'], 
                    info['idx1'] + len(info['p1']), # conceptual_idx2 for last_special
                    full_final_text_str, REQUIRED_NON_WHITESPACE
                )
                _write_pair_data_to_file(segments, info['p1'], info['p2'], output_pairs_dir)
                                        
        print(f"\nStream finished. Full content saved to '{stream_output_file}'")
        print(f"Final cumulative output length: {current_cumulative_len} characters.")

        num_skipped = sum(1 for s in pair_search_states.values() if s['permanently_skipped'])
        if num_skipped > 0:
            print(f"Number of pairs permanently skipped due to out-of-order finding: {num_skipped}")

        actual_files_saved = len(os.listdir(output_pairs_dir))
        if actual_files_saved > 0: print(f"Total fully qualified pair files saved: {actual_files_saved}")
        else: print("No fully qualified target pairs were detected and saved.")

    except Exception as e:
        print(f"Error during generation or file operations: {e}")
        import traceback; traceback.print_exc()
    finally:
        cumulative_text_buffer.close()


if __name__ == "__main__":
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.")
        print("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        exit()

    REQUIRED_NON_WHITESPACE_TEST = 150 
    OFFSET_CHARS_FOR_NEXT_SEARCH_TEST = 250

    def make_text_with_n_non_whitespace(target_n, base_char="x", prefix_text="", suffix_text=""):
        current_non_whitespace = sum(1 for c in prefix_text if not c.isspace()) + \
                                 sum(1 for c in suffix_text if not c.isspace())
        needed_from_base = max(0, target_n - current_non_whitespace)
        return prefix_text + (base_char * needed_from_base) + suffix_text

    final_test_input = """[
  {
    "2f8e": "Woo! We are Good morning everyone. Welcome to today's session of NAND office hours for scaling teams and enterprises. We're thrilled to see so many of you here from {hq} some of the world's top organizations. That tells us one thing. Scaling automation is on everyone's radar right now. And our goal is to leave you with practical nofluff advice that you can {xh} start using immediately. This monthly series is designed to help enterprise teams like yours go further with NAD. So, be sure to check our Luma events page for RSVPs for an RSVP for upcoming {og} sessions. Once again, I'm Angel Mendez, staff developer advocate here at NAND. I work closely with enterprise IT ops and cyber security teams to help them streamline operations, boost visibility, {lx} and ship automation that actually sticks. I'm excited to share some of what we've learned along the way to help your team scale more confidently. And joining me today is also Mandep Go, one {ha} of our solutions engineers who's been instrumental in guiding customers through complex rollouts and integrations. We'll be tag teaming your questions and give you insights today to {vk} give to take back to your team. So here's how it's going to work. We're going to kick off with a few announcements that are relevant to our enterprise teams. Then we're then we're {ep} going to dive into your presubmitted questions. Then we're going to leave some time for a live Q&A at the end. So feel free to drop your questions in the chat or Q&A box. If we run out of time, {eo} don't worry. Anything we don't get to will follow up in our next session. So let's jump right in. Before we do though, if your role touches cyber security, you're going to want to mark {dj} your calendar for June 5th. So we are actually uh teaming up with Vodafone and Bountius for a live webinar on how to operationalize threat intelligence with low code {ux} automation. You will hear directly from Claire von Hinsburg from Vodafone our very own Vrage from here at NADN and Sumit from Bountius on how leading security teams are integrating NADN with {eq} their SIM and sore systems to reduce alert fatigue and boost realtime response. If you're a sock manager, security leader, or automation architect, this {gu} one's for you. You can register now via the events page. And we're actually going to be uh putting up on the screen a QR code that you can use to register for this event. So again, I highly {bu} recommend it. Especially if you are in the cyber security space, this one is definitely for you. Excellent. So with that, let's go ahead and begin. We're going to start {ky} with a new featured spotlight segment. So, what we're going to be doing is at the beginning of the office hours, we're going to highlight new or upcoming features in the NADN platform. Today, {cy} I'm very excited about our new featured spotlight, something we just rolled out called insights, which is available to all users starting with version 1.89 of NADN. {sp} Now, I'm going to in just a moment I'm going to dive into it and kind of show you a visualization of it. But this feature gives admins a bird's eye view of how workflows are performing with two {ua} key components. There's a summary banner showing the key 7-day metrics like total executions, failure rates, um, and actually you can see it on my screen now. Um, and estimated time saved. {qh} Additionally, there's a deeper insights dashboard. Now, this part is available on pro and enterprise versions of of NADN that breaks down per workflow stats. We're going to take a look at it {bc} here in just a second. You can even set a time saved per execution value, which means you can finally track and share your return on investment with real numbers. I'm going to show you how to do {lz} that as well today. Enterprise customers also get access to advanced features like custom date ranges, hourly granularity. So if you've been trying to piece together impact from logs or {ty} external dashboards like I did for many years using Google Sheets, this is going to be a gamecher. So let's dive right in. Now to kind of give you some background, this feature is something {bf} I've been patiently waiting for for a very long time. This feature I used to replicate utilizing Google Sheets essentially. So what would happen is I would essentially go in and at the end {fu} of each uh workflow logic I would add a little Google Sheets node that would append you know how much time was saved in minutes and then the Google sheet I would have a dashboard that would sum up {fc} all those time saved and that is how I would know you know how much time was saved. This is key in enterprise organizations because many times you need to justify the use cases that you {go} are deploying internally and sometimes even to get for me for example I had to justify why we needed this in order to even get n deployed at my organization. Having worked at a couple of of {go} organizations in the past, one of the biggest issues for deployment, just getting it, you know, deployed in our organization was why like what what's why should we do it? And being able to {uc} show how many hours saved or minutes saved by these workflows is such a powerful way to do that. So, let's dive in. So here at the top of my NADEN uh uh instance I have this new ribbon {qx} essentially and you can see some key insights. So if you're on the community uh edition essentially you'll still have this but it is locked to uh to the last 7 days. So essentially you get some fe {lm} you get part of this feature working um but if you click on it you can actually get way more granular views. So again, on the community version, you won't get kind of this dashboard view here in the {kl} "
  },
  {
    "09e5": "kind of this dashboard view here in the {kl} bottom. You'll mostly get kind of these top views. Um, but if you do have the the enterprise or pro versions of of NAD, this will help essentially justify why we're doing why you have a {cf} particular workflows. I've also used it as a way to figure out, you know, when um when a workflow is failing and and going in and making it easier to fix. So, I actually when I deployed this a {yf} few days ago, um I was able to essentially fix a couple of workflows that I didn't realize weren't running correctly because of this feature. So, it's been very helpful so far. Now, {ba} you'll notice there is a time saved here at the top. And I just recently started doing this, so it's not showing it currently how much time is saved, but the way we do this, this is actually on {ns} a per workflow basis. So, what we're going to do is I'm going to open up one of these workflows here. So here I have a little workflow that alerts me internally whenever a new version of N8N {ms} is deployed. So this is just a little personal workflow that I built for myself to essentially know when a new version is out. And what we do here, so I'm going to go here to the top right. {wq} I'm going to go to settings and you're going to notice a new option here at the bottom. So estimated time saved uh here on the left. So here you can put at the termination of each run how much time {rr} was saved. So in this particular case, this one maybe saves me two minutes, I would say. So I would hit I would type in two. I'd hit save and there we go. Now whenever we go back to our {su} overview, it will every day essentially query this and check to see every time it runs how many minutes are saved. So it won't retroactively go back and give you that data, but it will essentially {pl} look at data moving forward. So again, this is a feature I'm really excited about. This is something that I feel is key in order to justifying an ADN internally, especially {gq} at large enterprise organizations where you need to be able to justify sometimes like if you're using DevOps hours in order to deploy it internally, it helps to be able to show a manager, hey, you {qc} know, this is how much time we've saved, this is how much work. And if you know how much time you've saved, you can extrapolate that out to how much money is saved. If you figure out, you know, {jq} per hour how much you're paying, you know, a specific team member, that will then multiply out by the amount of of minutes saved or time saved to give you a great idea as to like how much money {no} you're saving as well. So, that essentially covers this feature. Um, I I don't have a community version of deployment available to kind of show you the the difference in version, but if {sf} you do have it, if you update your to the latest version of NAD, you can essentially go in and see it yourself. Um, and again, if you do feel this is a feature that you need upgraded uh an {rj} upgrade for, feel free to reach out to our sales team to upgrade to the latest version or to the pro or enterprise versions. Excellent. So, moving right along. Let me see here. I'm just going {bn} to check real quick, see if there's any questions in regards to this. Okay, perfect. All right. Yeah, excellent. I don't see any questions specific to this feature. So, I'm going {sw} to go ahead and move right along. So, let's dive right into it. So, let's go ahead and jump into our presubmitted questions. So, with that in mind, let me go ahead and stop sharing for just a {eg} moment here. And let me see if we can pull up our questions here. So, give me one moment. All right. Excellent. Here we go. What is the best approach to parsing {bu} resumeé content like email, name, skills, and education? Also, do we have support for Microsoft Teams from Nikile Terra Lar? So, Nikuel, thank you so much for submitting uh your question here. {vg} So, I did a little bit of work on this the other day and I want to kind of highlight that this is a great feature to utilize AI agents on. So, I I wish this question was a little bit more {uv} specific. So, I kind of took my own path on this um as far as how to like approach it. Um and essentially what I've kind of settled on is using the chat feature within the NAND instance. {mp} I've set it up so that I can accept, you know, upload any file. And what I want to walk you through today is essentially how we can use AI agents to get structured outputs um into things like {gq} Google Sheets, for example. um with this kind of data. So let's go ahead and dive right in. Now to answer the second question first um you asked do we do you support Microsoft Teams and we do. So in {xa} this particular case I'm using the built-in chat window here on the bottom lefthand corner but what we can do is we can replace that here with the Microsoft Teams trigger. So we have Microsoft {ec} Teams. Um I don't have a Teams instance set up for demo yet. Um I am working on that to so we can show that live in the future. Um but for today just know that for example on new chat messages if you {to} set up like a team's bot what you can do is send into teams those files. Um and then from there essentially we can take and parse them out. So I'm going to walk you through the logic real quick and if {hq} there's any questions pertaining to that I'm happy to address them. Um and then we can move on to the next question. Um, so what I'm going to do, let me go ahead and I think I have some past executions {bj} here. Perfect. I don't see your screen. Yeah. Oh, no, I don't. Hold on. Let me share my screen once more here. Bear with me two seconds here. There we are. Perfect. Sorry about that. Excellent. {tn} Let's go ahead and copy this to editor. All right. Excellent. So, this is what I was talking about here. So, um, here we have our teams chat. And so essentially we do support teams um and {ge} "
  },
  {
    "ddc7": "essentially we do support teams um and {ge} you can replace this trigger internally this chat node um with the teams trigger. So in this particular case I'm just using chat and what I did is I created a fake resume essentially. So {nj} one of the things within about utilizing NADN is when a file comes into NADN it is stored as a binary object. So you can essentially imagine this, you know, it's not quite zeros and ones, but just about {op} just a blob of text that is then converted into the actual file that you typically see. So if we click on view here, we have a fake resume here um for Dr. Stacy Pard DDS. So this resume came {we} in as a text file. And so the first thing I want to talk about is how to essentially parse the file itself. So one of the things we have to do a little bit of transformation within NADN to be {hf} able to pull out the data to even get it to our AI agent. We can't you know unfortunately as of right now you can't quite get this uh these types of files directly into an AI agent um as a file. {bj} You have to do a little bit of conversion. Now I think that's changing and in the future I I think it will be a lot easier but for now let's take a look at how we handle it. {iv} Got to make sure to drink from the uh NAND merch mug here. So what we have first and foremost is a switch node. Now I like the switch because here what we can do is see essentially um we can {ki} basically create outputs for every kind of file type there is. And the goal is normalizing these outputs so that we can essentially pass these out to you know to the AI agent in a standardized way. {sq} So that is our goal here. So what I've done is I've gone into this the rules here and I've essentially passed in the file name and what I'm doing is looking for that file extension. So the file {bd} extension is going to tell us hey what kind of file is this? Right? So in this case we have a text file. So I have different checks for each one, right? So we've got HTML, ODS, PDF, RTF, so on and {fm} so forth. This is the one we're looking for. Fake résumés.ext. So in here, what we're doing essentially is we're taking that and we're passing it down a set output {of} here. And we're doing that because what we need to do is we need another node um called the ex uh binary extraction node. Let me actually pull it up here. So the way to pull this up, hit the plus here. {ms} Going to search for binary. There we go. And extract from file. So I've set up that same node but in different ways multiple times here. So essentially kind of outputting {vq} through each one here. In this particular case, we're taking the binary data, extracting out the text, and as you can see, we're putting it in a JSON object called text. So standardizing it, {bq} getting it ready to pass into our AI agent. Then we essentially merge it into this set node here. So essentially what we're doing is merging this output. Merge text outputs. My mentor would be {cg} so upset. He one of the key things when building out these workflows is make sure to name your nodes. Now, if you think of NAD as an analog to coding, it's the same as commenting your code. {le} If you don't comment your code, you're going to have no clue later on what is happening. So, what we're doing here is we're merging all these potential outputs to text. JSON.ext. And as you {vh} can see, it comes in kind of as this big blob, right? And so in this particular case, there was several I and I'm only really looking for one output in this particular case. Although we could in {hr} theory create have the AI agent parse multiple outputs in this case, but really we just want the first one in this case. And then this is where we get into {xw} the AI portion. So this this has really been a gamecher not just for NAN but for the world at large using AI agents in order to handle this kind of unstructured data um in a way that makes {oc} it easy to pass into other other tools right and in this particular case um I've given it I I like to think of these system messages and you do that by hitting add option system message I like {yw} to think of this as giving it a personality right so the thought process here is the AI agents kind of start off as a blank slate. You're giving it a personality. You're giving it it an {mt} instruction set in the form of two prompts. The system message, which kind of tells it what it's supposed to be doing, and then the user message, which is giving it the data to pro to process {zy} essentially. So in this one, it's pretty easy. You're a helpful assistant that extracts email, name, skills, and education from resumeé text. Pretty straightforward, right? And then we're {lv} passing in that ré text. So, in the past, if I was a programmer, this step would have taken me hours and it would have been very very specific because what I would have had to do is use {sc} something like reax um or some kind of JavaScript code to essentially go in and look for something that said, you know, name equals, you know, Dr. Stacy Pard or whatever. And this would only work if {cl} the input was the same every time. This of course makes the process very very difficult. Now I can build something. I literally built this in maybe 20 minutes essentially to get this working. And the {vm} the key point that you need to make here is that to get it in this nice format here there is one additional step. And this is kind of why I like the question this question that was submitted because {ok} it allows me to show the structured output. So let's take a look. You'll notice here a little toggle switch and I've switched that on. Normally it would have output these four items as one blob {oi} of text essentially which again is also not useful right like it's very difficult to tell like a Google sheet uh node hey here's the name here's the email here's the skills when it's all {wj} "
  },
  {
    "29t9": "email here's the skills when it's all {wj} just one blob of text what I really need essentially is it to come out in a specific way toggle helps it gives you a new option here let's take a look I'm {ai} going to zoom in just a this output parser. Now, if we double click on this, you'll see here that we're able to define what our output looks like. So, this is huge when {mf} creating these types of agents because by doing this, you can define essentially, hey, this is what I want. This is what I'm looking to do. Um, and what that's going to allow us to do is {bk} then we can map different outputs. So essentially what I'm doing here is validating the output making sure that the name that came in is you know is actually showing up that the uh email is {ya} actually showing up. Basically we're making sure that these these outputs stay consistent almost like a test in a way. And what that's going to allow us to do now is essentially pass that into {bg} our Google Sheets note. Now I didn't actually go through that step but it's very straightforward from that point on. The other thing we want to do as you know that kind of the downside of using {nc} AI agents is there is a chance of hallucination or of errors and what we want to do is handle that those types of errors. Um so in this case what I've done and a feature that I think is not {yl} used often enough. I don't I I think because it's hidden in the settings most people don't know it exists but typically when we get to this step it if you don't change the settings it just {wn} stops. it just stops working. So if you open it up and you go to settings, you can on error create a new output for error outputs. Now in this case, what we can do is say, hey, if we error out {vh} here, that means that the AI agent messed up. Something didn't work out correctly. You know, something was not working as expected. So we can then pass a set message saying, \"Hey, unable to {gz} parse the agent's output.\" We can say, \"Hey, something's wrong with our AI agent. you need to figure it out. This helps essentially handle gracefully errors that come out of that AI agent {lt} and allow us to then kind of either resubmit it or fix our prompt or whatever needs to happen. But then eventually we can then pass into the chat if you use output or {kz} text as the key object here these values that we were looking for. So essentially in a nutshell that is is the way to you know to kind of handle this process. So if you have if you're receiving a lot of {ca} unstructured inputs like different file types and you need to get them in a structured output AI agents are wonderful for this. Um and I do see a related question has come in. How do we {wt} decide between various tools that are available um for Agentic AI automation? NAN, Langraph, Langflow, CUI, AWS, Vert. So in to it's kind of hard to answer that question. You have to kind of have {pp} a good understanding of um and and I guess let me split that question up here. the various tools like when we talk about tools tools are abilities at least in the NADN terminology tools are {xx} plug you can almost imagine them as plugins to your AI agents to make it do all kinds of stuff you can do things like call on another sub workflow I use this quite a bit for things like {tw} searching uh databases right so giving the AI searching capabilities to look in a specific database get a certain output and then use that to answer a question or you can for example give it access to {lj} the web. You can basically give it access to the HTTP request tool to essentially pass an output out and essentially go to a website and using that data from that {mw} website answer the question as well. So just to clarify terminology in this case I think based on the examples that you gave I think you mean the model right here. So how would we choose like which {pk} model is best and a lot of it is going to depend on your internal use cases what's available especially for enterprise organizations um some enterprises might have their own {ea} internal models that they're using um and that is probably going to define or just you know help you make that decision um initially. So if you know if you want the kind of the simplest most {lv} easiest kind of dropin tool I recommend like open ais right that t tech technically for general work it it works good at just about everything. Um if you're looking for something that's like {ep} more PII friendly you're trying to protect data you might want to run open AI within Azure. So within Azure, you can actually deploy your own version of open {zt} AI and essentially using that model of of Azure. It will not be used for example for training data. So you can basically be sure I mean as sure as you can be with any any model out there that {bf} your data is not going to leak. So you might want to go with Azure. Now your organization might internally be using AWS. So you could do that or maybe Google Gemini. So choosing the model um {fy} essentially kind of falls down to like what your needs are and what your organization has allowed you to utilize internally. Um and so from there essentially that is how I would pick or {um} if you re if privacy really is like the number one thing for you my recommendation is use Olama essentially deploy it yourself locally. Um, so anyway, I Mandy, Mandy, I know I haven't {uz} really called on you much. Do you have any insights on this as well as far as like how to choose which model like what model works best for what? Do you have any suggestions on that as well? {bj} Yeah, there's a lot of model choices out there. I think um one first one is context windows. You know, are you going to you require a huge context window? Um if you're categorizing stuff, for {ha} "
  },
  {
    "56ca": "if you're categorizing stuff, for {ha} example, you you might use a mini or a nano model. these are very very quick at responding and and putting things into buckets. But if you need something a bit more generative um and and you don't {jm} need to provide too much context, then use the the cheapest model for your for your um input. So I think that's a a good tip as well. Beautiful. Beautiful. Yep. I agree. Totally forgot. One of the {ul} things that like um I really like like for example I know open AI's model accepts at least the four four models accept up to like 128,000 tokens. They have a web page where you can go and I {wd} think it's called a tokenizer and you can put in sample text and it'll tell you how many tokens it uses. And for some of the builds I've done internally, I've actually gone in and tested it {vf} because I don't I don't want to go too I I want to make sure that I'm not too close to that context window because the closer I get, the more likely hallucinations are to arrive. Exactly. {yg} So be very careful about that. So and then the other one Angel is is uh around tool calling. Not all models can call tools. So if you if you just need a a very basic kind of question answering {fa} the agent is probably not the right node. You can use the basic question answering node um that we have. But if you need to use tools then you need to use an appropriate model that has tool {pj} calling. I found this out the hard way. I was trying to run all lama models and trying to run everything locally and then all of a sudden you get a message model does not support calling tools. So {qp} just just be aware make sure you take the requirements. Use the right use the right model. use the right node in NA10 for your use case. Great point. Yeah, and just to kind of point out what {xb} Mandep is talking about here. So, you have the AI agent node here essentially. That's what we're running right here. But we have the ability to kind of have more what what we call it uh more {gs} focused AI agents essentially. Exactly. So, you can use like a basic LLM chain. So, or information extractor, question and answer chain. So sentiment analysis, this one I like a lot. So like for {gp} example, if your goal is like simply to figure out whether or not you know me, like incoming messages are a certain, you know, happy, sad, angry, um, you know, looking to purchase, not looking {ea} purchase, that kind of stuff, you would use something like this because you don't need these tools. It doesn't it it's not needed. And not only that, but it's more focused. It's more these {uh} models are set kind of ahead of time to allow for for uh le they're less likely to hallucinate doing what you're looking for because they're not as broad essentially. And a great one that you're {hw} hiding underneath there is the the classifier the text classifier. So it's a great way of of branching your logic. You can think of it as an intelligent switch switch statement. Absolutely. So {vz} for categorizing emails, categorizing the priority of the support request and the re the real trick on this one is to rename the output. So you know it just flows in a in a very natural way. I {wj} think we were describing earlier like um renaming the nodes, renaming the the workflow items. It's like commenting your code. It's like writing meaningful environment {wp} variable names, right? you alongside your workflow, you get your documentation and it's a way of explaining what your thinking is to to your fellow colleagues and workflow {uf} builders and even yourself. Sometimes you might not visit this, you know, for a few months and you come back and you're like, what was I thinking? What was going on here? Just labeling them {cr} makes such a big difference. Um, excellent. All right, great points. Great points. Uh, let's go ahead and dive into our next question. So from there, let's go ahead and pull up the {mf} next one. Um, excellent. How do you handle node level errors like deprecated credentials, JSON schema model updates that and also set up a DLQ workflows for malformed input data. Now this came from {ra} Jose. So this is a good question. So let me pull up um another workflow that I built out. So this is much simpler and I'm going to start by answering the question. So {td} automating the error handling is possible. It's not easy though because you have to kind of know in advance what your errors are going to be. So like if you know for example that {fx} you have you're going to be having credential errors coming up, that's something that you might want to take a couple of different approaches on. So for example, if you're using a {kw} local process to generate a token for an API, you might do that process manually through HTTP requests or what you might want to do is make sure that you use the appropriate mechanism because we might {og} be handling that for you. So let's let me go ahead and show an example of what I'm talking about here. So I'm going to use the HTTP request node as a as an example. Now, {pz} this is wonderful in enterprise organizations because you might have internal APIs that you're working with. You we may not have a node for what you're trying to connect to internally. {uv} So, you may want to use the HTTP request node. Now, the downside is there might be authentication that you might have to do. that authentication might you know use a process like OOTH um or OOTH 2 to {mk} generate tokens kind of on a regular basis and use those tokens to then authenticate. Now you can do that process manually and you know hit an endpoint with the correct {ap} credentials receive back a token use that token to then pass along to your workflow. From there, essentially, you're able to to um to authenticate your request. My first the first thing {sa} "
  },
  {
    "6f36": "your request. My first the first thing {sa} I'd like to address there is make sure that you use the appropriate authentication type because you might be able to, for example, um use a an authentication type that we already {ql} support. So, for example, if it's OOTH 2, there's no need to um to reinvent the wheel. So let me zoom in just a little bit here to make it a little easier to read. There we go. Perfect. So perfect. {io} So basically the first step is making sure you're using the right authentication type. Now there are po times when this just won't work. Maybe the the OOTH 2 um is it's following a {fa} slightly different process than the standard OOTH 2 in which case you have to do the manual process. So to answer to kind of start answering the question in a coherent way, we want to make sure {sc} that the we're using the correct credential type to avoid issues with credentials. The second step is in terms of automation, the first step is always monitoring. you always {ry} want to do things manually because when you to be able to you never know what types of errors you're going to get first and foremost and NADN has a built-in ability to do that monitoring {yi} and I want and this is not a feature I think that a lot of people are aware of um so I I wanted to kind of highlight it so I built this workflow here as an example of what's possible but in every {ht} workflow if you click on the top right hand corner and you go to settings you have the ability to set an error workflow. And so here what we can do is like for example I have my automated {ay} error handling workflow. I'm just going to go ahead and set it. Now I can I can create different automated error hand or different error workflows for different workflows. So I can say essentially you {wb} know I can have one for credential types, one for schemas, I can have one for um you know the different types of of of errors that might come in. or I can just {lu} have one generic one, whatever you prefer. So I recommend as you start building more and more workflows, this becomes very critical. Make sure that you create these air workflows that {pe} alert you internally, maybe through something like Slack, you know that, hey, something has failed. We need to kind of address this. Now, the new insights feature we released today is {rx} going to help because within N8N now you can see these errors kind of almost in real time and start kind of addressing those as they happen. But it's it's not or not in real time but kind of in a {cl} summary view. This will allow you to handle them in real time and then you can build on this. So initially you might just be monitoring right? So you'll have these error workflows come {ii} in and the cool thing is you can actually hit the play button on the error trigger and get a sample um one. So an example of what a workflow error would look like. And so what I'm going {mm} to do here is I've created an if check that checks to see if if it's coming from an HTTP request node. Now this is using the workflow name. So what I've done just kind of take a step back here. {of} I'm going just add another condition and the last node executed. So if I know here the name of the node, it's going to give it to me here. So if I follow a certain standard like if I name all of {oy} my HTTP request nodes like uh uh API call to service and then maybe I put dash HTTP request. What I can do is create an if check where if it {eo} contains HTTP request I can route them down a certain path every time. So that begins the process of monitoring. We can start monitoring and maybe get a different {if} alert type because if it's a credential as opposed to just a generic uh error that is not specific to that. That's step one. Step two then once you've seen this enough and you know the process, {wu} you've automated the process or not automated the process but you understand the process well enough and the errors well enough to kind of understand the edge cases, you can start replacing this {ih} with more of an automation. Now, a second thing that I recommend is use your subworkflows. So, one of the one of the things that you might be doing {id} internally is using the HTTP request node. Using the HTTP request node to fix, you know, some kind of manual error is going to be difficult. So, what you may want to do is wrap this HTTP request {wh} node inside of a subworkflow. And then all those workflows that use that HTTP request, instead of using the HTTP request, you use a subworkflow. What this allows you to do is it gives you {sy} one place that you have to fix that error in. And then when you fix it in that subworkflow, you could have that subworkflow attached to 10 other workflows. And with one edit, you'll fix {rl} all 10. So that is like kind of step two kind of essentially ensure that you funnel all of your potential errors into these subworkflows to reduce the complexity of fixing these things. And {na} then step three in my opinion is automating the fix. So there's a couple of different ways to do that. Um and Mandy I'm going to ask your help on this. Um this is something I have not {ut} yet tried but I know I know there's kind of two ways that we could approach this. We could approach this with either the credential side or the workflow side. The workflow side I think is a little {jq} bit more complex because you can update a workflow but you have to know the JSON to update it. That is difficult. You know essentially knowing what the errors are going to be and then being able to {fk} pass in the JSON of a fully formed workflow is difficult. If you reduce it to a simple subworkflow that has only one node in it that becomes inf quite a bit easier. So obviously that makes more {pg} "
  }
]
    """

    generate_and_save(final_test_input, "generated_output", api_key)
