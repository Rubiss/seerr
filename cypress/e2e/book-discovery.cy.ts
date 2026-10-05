describe('Filtered book discovery', () => {
  let originalHideAvailable: boolean;

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.request('/api/v1/settings/main').then(({ body }) => {
      originalHideAvailable = body.hideAvailable;
      cy.request('POST', '/api/v1/settings/main', {
        ...body,
        hideAvailable: true,
      });
    });
  });

  afterEach(() => {
    cy.request('/api/v1/settings/main').then(({ body }) => {
      cy.request('POST', '/api/v1/settings/main', {
        ...body,
        hideAvailable: originalHideAvailable,
      });
    });
  });

  it('waits for a hidden batch to resolve before requesting more pages', () => {
    const requestedPages: number[] = [];
    let releasePage: () => void;
    const fourthPage = new Cypress.Promise<void>((resolve) => {
      releasePage = resolve;
    });

    cy.viewport(800, 600);
    cy.intercept('GET', '/api/v1/discover/books?*', async (request) => {
      const page = Number(request.query.page);
      requestedPages.push(page);
      if (page === 4) {
        await fourthPage;
      }
      request.reply({
        page,
        totalPages: 10,
        totalResults: 200,
        results: Array.from({ length: 20 }, (_, index) => ({
          id: page * 20 + index,
          mediaType: 'book',
          title: `Book ${page}-${index}`,
          overview: '',
          posterPath: '',
          mediaInfo: { status: page < 4 ? 5 : 1 },
        })),
      });
    }).as('books');

    cy.visit('/discover/books');
    cy.wrap(requestedPages).should('deep.equal', [1, 2, 3, 4]);
    // Exercise repeated scroll renders while the first visible page is pending.
    for (let i = 0; i < 5; i++) {
      cy.window().trigger('scroll');
      cy.wait(100);
    }
    cy.then(() => {
      expect(requestedPages).to.deep.equal([1, 2, 3, 4]);
      releasePage();
    });
    cy.get('[data-testid=title-card]').should('have.length', 20);
    cy.then(() => expect(requestedPages).to.deep.equal([1, 2, 3, 4]));
  });
});
