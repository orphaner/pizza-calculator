DOCKER_NAMESPACE := nicolaznk
IMAGE_NAME := pizza-calculator

all: build

.PHONY: build
build:
	docker image build -t $(DOCKER_NAMESPACE)/$(IMAGE_NAME):latest .
	docker push $(DOCKER_NAMESPACE)/$(IMAGE_NAME):latest
