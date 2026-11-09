import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MENTORS } from "@/data/mentors";
import { MENTOR_PROMPTS } from "../../../supabase/functions/mentor-response/prompts/index.ts";
import { MentorCard } from "./MentorCard";

describe("mentors", () => {
  it("frontend profiles and server prompt configs describe the same three mentors", () => {
    expect(MENTORS.map((m) => m.id).sort()).toEqual(Object.keys(MENTOR_PROMPTS).sort());
    for (const m of MENTORS) {
      expect(MENTOR_PROMPTS[m.id].name).toBe(m.name);
      expect(MENTOR_PROMPTS[m.id].nameAr).toBe(m.nameAr);
    }
  });

  it.each(MENTORS)("renders the $firstName card with name, domain and personality", (mentor) => {
    render(
      <MemoryRouter>
        <MentorCard mentor={mentor} to={`/learn/${mentor.id}`} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: mentor.name })).toBeInTheDocument();
    expect(screen.getByText(mentor.domain)).toBeInTheDocument();
    expect(screen.getByText(mentor.personality[0])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(mentor.firstName) })).toHaveAttribute(
      "href",
      `/learn/${mentor.id}`,
    );
  });
});
